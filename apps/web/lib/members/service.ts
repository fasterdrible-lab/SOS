import bcrypt from "bcryptjs"

import type { ApiErrorCode } from "@/lib/api/errors"
import { recordAudit } from "@/lib/audit/record"
import { prisma } from "@/lib/db"
import type { Prisma } from "@/lib/generated/prisma/client"
import {
  type AssignableRole,
  inviteExpiry,
  inviteState,
  isAdminRole,
  normalizeEmail,
  passwordResetExpiry,
  passwordResetState,
  planPasswordReset,
  planRemoval,
  planRoleChange,
} from "@/lib/members/rules"
import { generateInviteToken, hashInviteToken, isInviteTokenShape } from "@/lib/members/token"
import { NEW_PASSWORD_MIN } from "@/lib/validations/member"

export type Outcome<T> = ({ ok: true } & T) | { ok: false; code: ApiErrorCode; message: string }

const fail = (code: ApiErrorCode, message: string) => ({ ok: false as const, code, message })

/** Erro de regra lancado dentro da transacao para desfazer o que ja foi gravado. */
class RuleError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string
  ) {
    super(message)
  }
}

async function inTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<Outcome<{ value: T }>> {
  try {
    return { ok: true, value: await prisma.$transaction(run) }
  } catch (error) {
    if (error instanceof RuleError) return fail(error.code, error.message)
    throw error
  }
}

/**
 * Trava os vinculos da organizacao ate o fim da transacao: duas trocas de papel
 * simultaneas nao deixam a organizacao sem administrador.
 */
async function lockMembers(tx: Prisma.TransactionClient, organizationId: string) {
  await tx.$queryRaw`select id from organization_members where "organizationId" = ${organizationId} for update`
  const members = await tx.organizationMember.findMany({
    where: { organizationId },
    select: { id: true, userId: true, role: true },
  })
  return { members, adminCount: members.filter((member) => isAdminRole(member.role)).length }
}

export async function listMembers(organizationId: string, now = new Date()) {
  const [members, invites] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, _count: { select: { members: true } } } },
      },
    }),
    prisma.organizationInvite.findMany({
      where: { organizationId, acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        acceptedAt: true,
        revokedAt: true,
        invitedBy: { select: { name: true, email: true } },
      },
    }),
  ])

  return {
    members: members.map((member) => ({
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      createdAt: member.createdAt.toISOString(),
      /** Participa de outras organizacoes: a senha nao e redefinida por aqui. */
      sharedAccount: member.user._count.members > 1,
    })),
    invites: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      state: inviteState(invite, now),
      invitedBy: invite.invitedBy?.name ?? invite.invitedBy?.email ?? null,
    })),
  }
}

/** Cria o convite. Um convite pendente para o mesmo e-mail e revogado: vale so o link novo. */
export async function createInvite(input: {
  organizationId: string
  actorUserId: string
  email: string
  role: AssignableRole
  now?: Date
}): Promise<Outcome<{ token: string; inviteId: string; expiresAt: string }>> {
  const now = input.now ?? new Date()
  const email = normalizeEmail(input.email)

  const alreadyMember = await prisma.organizationMember.findFirst({
    where: { organizationId: input.organizationId, user: { email: { equals: email, mode: "insensitive" } } },
    select: { id: true },
  })
  if (alreadyMember) return fail("CONFLICT", "Essa pessoa ja faz parte da organizacao.")

  const token = generateInviteToken()
  const result = await inTransaction(async (tx) => {
    await tx.organizationInvite.updateMany({
      where: { organizationId: input.organizationId, email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    })
    const invite = await tx.organizationInvite.create({
      data: {
        organizationId: input.organizationId,
        email,
        role: input.role,
        tokenHash: hashInviteToken(token),
        invitedById: input.actorUserId,
        expiresAt: inviteExpiry(now),
      },
      select: { id: true, expiresAt: true },
    })
    await recordAudit(
      {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "member.invited",
        entityType: "OrganizationInvite",
        entityId: invite.id,
        metadata: { role: input.role },
      },
      tx
    )
    return invite
  })

  if (!result.ok) return result
  return { ok: true, token, inviteId: result.value.id, expiresAt: result.value.expiresAt.toISOString() }
}

export async function revokeInvite(input: {
  organizationId: string
  actorUserId: string
  id: string
}): Promise<Outcome<object>> {
  const result = await inTransaction(async (tx) => {
    const revoked = await tx.organizationInvite.updateMany({
      where: { id: input.id, organizationId: input.organizationId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    if (revoked.count === 0) {
      const exists = await tx.organizationInvite.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
        select: { id: true },
      })
      throw exists
        ? new RuleError("CONFLICT", "O convite ja foi aceito ou revogado.")
        : new RuleError("NOT_FOUND", "Convite nao encontrado.")
    }
    await recordAudit(
      {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "member.invite-revoked",
        entityType: "OrganizationInvite",
        entityId: input.id,
      },
      tx
    )
  })
  return result.ok ? { ok: true } : result
}

export async function changeMemberRole(input: {
  organizationId: string
  actorUserId: string
  memberId: string
  role: AssignableRole
}): Promise<Outcome<{ role: string }>> {
  const result = await inTransaction(async (tx) => {
    const { members, adminCount } = await lockMembers(tx, input.organizationId)
    const target = members.find((member) => member.id === input.memberId)
    if (!target) throw new RuleError("NOT_FOUND", "Pessoa nao encontrada.")

    const plan = planRoleChange({
      actorUserId: input.actorUserId,
      targetUserId: target.userId,
      currentRole: target.role,
      newRole: input.role,
      adminCount,
    })
    if (!plan.ok) throw new RuleError(plan.code, plan.message)

    await tx.organizationMember.update({ where: { id: target.id }, data: { role: input.role } })
    await recordAudit(
      {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "member.role-changed",
        entityType: "OrganizationMember",
        entityId: target.id,
        metadata: { from: target.role, to: input.role },
      },
      tx
    )
  })
  return result.ok ? { ok: true, role: input.role } : result
}

/**
 * Remove o vinculo com a organizacao; a conta continua (pode pertencer a outras).
 * Negociacoes e atividades da pessoa ficam com ela como dona, visiveis para gestores.
 */
export async function removeMember(input: {
  organizationId: string
  actorUserId: string
  memberId: string
}): Promise<Outcome<object>> {
  const result = await inTransaction(async (tx) => {
    const { members, adminCount } = await lockMembers(tx, input.organizationId)
    const target = members.find((member) => member.id === input.memberId)
    if (!target) throw new RuleError("NOT_FOUND", "Pessoa nao encontrada.")

    const plan = planRemoval({
      actorUserId: input.actorUserId,
      targetUserId: target.userId,
      currentRole: target.role,
      adminCount,
    })
    if (!plan.ok) throw new RuleError(plan.code, plan.message)

    await tx.organizationMember.delete({ where: { id: target.id } })
    await recordAudit(
      {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "member.removed",
        entityType: "OrganizationMember",
        entityId: target.id,
        metadata: { role: target.role },
      },
      tx
    )
  })
  return result.ok ? { ok: true } : result
}

/**
 * Link de nova senha para uma pessoa da organizacao (para quem esqueceu). Um link
 * anterior ainda nao usado deixa de valer.
 */
export async function createPasswordReset(input: {
  organizationId: string
  actorUserId: string
  memberId: string
  now?: Date
}): Promise<Outcome<{ token: string; expiresAt: string }>> {
  const now = input.now ?? new Date()
  const member = await prisma.organizationMember.findFirst({
    where: { id: input.memberId, organizationId: input.organizationId },
    select: { id: true, userId: true, user: { select: { _count: { select: { members: true } } } } },
  })
  if (!member) return fail("NOT_FOUND", "Pessoa nao encontrada.")

  const plan = planPasswordReset({ membershipCount: member.user._count.members })
  if (!plan.ok) return fail(plan.code, plan.message)

  const token = generateInviteToken()
  const result = await inTransaction(async (tx) => {
    await tx.passwordReset.updateMany({
      where: { userId: member.userId, usedAt: null, revokedAt: null },
      data: { revokedAt: now },
    })
    const reset = await tx.passwordReset.create({
      data: {
        organizationId: input.organizationId,
        userId: member.userId,
        tokenHash: hashInviteToken(token),
        createdById: input.actorUserId,
        expiresAt: passwordResetExpiry(now),
      },
      select: { id: true, expiresAt: true },
    })
    await recordAudit(
      {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "member.password-reset-created",
        entityType: "OrganizationMember",
        entityId: member.id,
        metadata: { resetId: reset.id },
      },
      tx
    )
    return reset
  })

  if (!result.ok) return result
  return { ok: true, token, expiresAt: result.value.expiresAt.toISOString() }
}

/** O que a pagina publica de nova senha mostra. Token invalido ou desconhecido: null. */
export async function getPasswordResetByToken(token: string, now = new Date()) {
  if (!isInviteTokenShape(token)) return null
  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    select: { usedAt: true, revokedAt: true, expiresAt: true, user: { select: { email: true } } },
  })
  if (!reset) return null
  return { email: reset.user.email, state: passwordResetState(reset, now) }
}

/** Grava a nova senha. O link vale uma vez; a conta precisa continuar so nesta organizacao. */
export async function redeemPasswordReset(input: {
  token: string
  password: string
  now?: Date
}): Promise<Outcome<{ email: string }>> {
  const now = input.now ?? new Date()
  if (!isInviteTokenShape(input.token)) return fail("NOT_FOUND", "Link nao encontrado.")

  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashInviteToken(input.token) },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      usedAt: true,
      revokedAt: true,
      expiresAt: true,
      user: { select: { email: true, _count: { select: { members: true } } } },
    },
  })
  if (!reset) return fail("NOT_FOUND", "Link nao encontrado.")

  const state = passwordResetState(reset, now)
  if (state === "USED") return fail("CONFLICT", "Este link ja foi usado.")
  if (state === "REVOKED") return fail("CONFLICT", "Este link foi substituido por outro. Use o mais recente.")
  if (state === "EXPIRED") return fail("CONFLICT", "Este link expirou. Peca um novo ao administrador.")

  const plan = planPasswordReset({ membershipCount: reset.user._count.members })
  if (!plan.ok) return fail(plan.code, plan.message)

  if (input.password.length < NEW_PASSWORD_MIN) {
    return fail("BAD_REQUEST", `A senha precisa ter pelo menos ${NEW_PASSWORD_MIN} caracteres.`)
  }
  const passwordHash = await bcrypt.hash(input.password, 12)

  const result = await inTransaction(async (tx) => {
    // Condicionado ao estado lido: o mesmo link usado duas vezes grava uma senha e um 409.
    const claimed = await tx.passwordReset.updateMany({
      where: { id: reset.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    })
    if (claimed.count === 0) throw new RuleError("CONFLICT", "Este link ja foi usado.")

    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } })
    await recordAudit(
      {
        organizationId: reset.organizationId,
        actorUserId: reset.userId,
        action: "member.password-reset",
        entityType: "User",
        entityId: reset.userId,
        metadata: { resetId: reset.id },
      },
      tx
    )
  })

  return result.ok ? { ok: true, email: reset.user.email } : result
}

/** Contas antigas podem ter o e-mail com maiusculas; o do convite e normalizado. */
function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, passwordHash: true },
  })
}

/** O que a pagina publica do convite mostra. Token invalido ou desconhecido: null. */
export async function getInviteByToken(token: string, now = new Date()) {
  if (!isInviteTokenShape(token)) return null
  const invite = await prisma.organizationInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    select: {
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      organization: { select: { name: true } },
    },
  })
  if (!invite) return null

  const user = await findUserByEmail(invite.email)
  return {
    email: invite.email,
    role: invite.role,
    organizationName: invite.organization.name,
    expiresAt: invite.expiresAt.toISOString(),
    state: inviteState(invite, now),
    hasAccount: Boolean(user),
  }
}

/**
 * Aceita o convite. Conta nova: cria com nome e senha. Conta existente: exige a
 * senha atual, para que so a dona do e-mail entre na organizacao.
 */
export async function acceptInvite(input: {
  token: string
  name?: string
  password: string
  now?: Date
}): Promise<Outcome<{ email: string }>> {
  const now = input.now ?? new Date()
  if (!isInviteTokenShape(input.token)) return fail("NOT_FOUND", "Convite nao encontrado.")

  const invite = await prisma.organizationInvite.findUnique({
    where: { tokenHash: hashInviteToken(input.token) },
    select: { id: true, organizationId: true, email: true, role: true, expiresAt: true, acceptedAt: true, revokedAt: true },
  })
  if (!invite) return fail("NOT_FOUND", "Convite nao encontrado.")

  const state = inviteState(invite, now)
  if (state === "ACCEPTED") return fail("CONFLICT", "Este convite ja foi usado.")
  if (state === "REVOKED") return fail("CONFLICT", "Este convite foi cancelado. Peca um novo ao administrador.")
  if (state === "EXPIRED") return fail("CONFLICT", "Este convite expirou. Peca um novo ao administrador.")

  const existing = await findUserByEmail(invite.email)

  let passwordHash: string | null = null
  if (existing) {
    if (!existing.passwordHash || !(await bcrypt.compare(input.password, existing.passwordHash))) {
      return fail("UNPROCESSABLE", "Senha incorreta para a conta deste e-mail.")
    }
  } else {
    if (!input.name) return fail("BAD_REQUEST", "Informe seu nome.")
    if (input.password.length < NEW_PASSWORD_MIN) {
      return fail("BAD_REQUEST", `A senha precisa ter pelo menos ${NEW_PASSWORD_MIN} caracteres.`)
    }
    passwordHash = await bcrypt.hash(input.password, 12)
  }

  const result = await inTransaction(async (tx) => {
    const userId =
      existing?.id ??
      (await tx.user.create({
        data: { email: invite.email, name: input.name, passwordHash },
        select: { id: true },
      })).id
    // Quem acabou de aceitar entra na organizacao que convidou, ja no proximo login.
    await tx.user.update({ where: { id: userId }, data: { lastOrganizationId: invite.organizationId } })

    const already = await tx.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId } },
      select: { id: true },
    })
    if (already) throw new RuleError("CONFLICT", "Voce ja faz parte desta organizacao.")

    // Condicionado ao estado lido: dois aceites ao mesmo tempo geram um vinculo e um 409.
    const claimed = await tx.organizationInvite.updateMany({
      where: { id: invite.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { acceptedAt: now, acceptedUserId: userId },
    })
    if (claimed.count === 0) throw new RuleError("CONFLICT", "Este convite ja foi usado.")

    const member = await tx.organizationMember.create({
      data: { organizationId: invite.organizationId, userId, role: invite.role },
      select: { id: true },
    })
    await recordAudit(
      {
        organizationId: invite.organizationId,
        actorUserId: userId,
        action: "member.joined",
        entityType: "OrganizationMember",
        entityId: member.id,
        metadata: { role: invite.role, inviteId: invite.id },
      },
      tx
    )
  })

  return result.ok ? { ok: true, email: invite.email } : result
}
