import type { ApiErrorCode } from "@/lib/api/errors"
import { recordAudit } from "@/lib/audit/record"
import { prisma } from "@/lib/db"

type Outcome<T> = ({ ok: true } & T) | { ok: false; code: ApiErrorCode; message: string }
const fail = (code: ApiErrorCode, message: string) => ({ ok: false as const, code, message })

interface Actor {
  organizationId: string
  actorUserId: string
}

export async function listTeams(organizationId: string) {
  const teams = await prisma.team.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { members: true } } },
  })
  return teams.map((team) => ({ id: team.id, name: team.name, memberCount: team._count.members }))
}

/** Nome unico na organizacao, sem diferenciar maiusculas. */
async function nameTaken(organizationId: string, name: string, exceptId?: string) {
  const found = await prisma.team.findFirst({
    where: {
      organizationId,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  })
  return Boolean(found)
}

export async function createTeam(input: Actor & { name: string }): Promise<Outcome<{ id: string; name: string }>> {
  if (await nameTaken(input.organizationId, input.name)) return fail("CONFLICT", "Ja existe uma equipe com esse nome.")
  const team = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: { organizationId: input.organizationId, name: input.name },
      select: { id: true, name: true },
    })
    await recordAudit(
      {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "team.created",
        entityType: "Team",
        entityId: created.id,
      },
      tx
    )
    return created
  })
  return { ok: true, ...team }
}

export async function renameTeam(
  input: Actor & { id: string; name: string }
): Promise<Outcome<{ id: string; name: string }>> {
  const team = await prisma.team.findFirst({
    where: { id: input.id, organizationId: input.organizationId },
    select: { id: true },
  })
  if (!team) return fail("NOT_FOUND", "Equipe nao encontrada.")
  if (await nameTaken(input.organizationId, input.name, input.id)) {
    return fail("CONFLICT", "Ja existe uma equipe com esse nome.")
  }
  await prisma.$transaction(async (tx) => {
    await tx.team.update({ where: { id: team.id }, data: { name: input.name } })
    await recordAudit(
      {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "team.renamed",
        entityType: "Team",
        entityId: team.id,
      },
      tx
    )
  })
  return { ok: true, id: team.id, name: input.name }
}

/** Remove a equipe; as pessoas ficam sem equipe (gestor sem equipe volta a ver tudo). */
export async function removeTeam(input: Actor & { id: string }): Promise<Outcome<{ members: number }>> {
  const team = await prisma.team.findFirst({
    where: { id: input.id, organizationId: input.organizationId },
    select: { id: true, _count: { select: { members: true } } },
  })
  if (!team) return fail("NOT_FOUND", "Equipe nao encontrada.")
  await prisma.$transaction(async (tx) => {
    await tx.team.delete({ where: { id: team.id } })
    await recordAudit(
      {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "team.removed",
        entityType: "Team",
        entityId: team.id,
        metadata: { members: team._count.members },
      },
      tx
    )
  })
  return { ok: true, members: team._count.members }
}

/** Coloca a pessoa numa equipe da mesma organizacao, ou tira (`teamId` nulo). */
export async function setMemberTeam(
  input: Actor & { memberId: string; teamId: string | null }
): Promise<Outcome<{ teamId: string | null }>> {
  const member = await prisma.organizationMember.findFirst({
    where: { id: input.memberId, organizationId: input.organizationId },
    select: { id: true, teamId: true },
  })
  if (!member) return fail("NOT_FOUND", "Pessoa nao encontrada.")
  if (input.teamId) {
    const team = await prisma.team.findFirst({
      where: { id: input.teamId, organizationId: input.organizationId },
      select: { id: true },
    })
    if (!team) return fail("BAD_REQUEST", "Equipe invalida.")
  }
  if (member.teamId === input.teamId) return { ok: true, teamId: input.teamId }

  await prisma.$transaction(async (tx) => {
    await tx.organizationMember.update({ where: { id: member.id }, data: { teamId: input.teamId } })
    await recordAudit(
      {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "member.team-changed",
        entityType: "OrganizationMember",
        entityId: member.id,
        metadata: { from: member.teamId, to: input.teamId },
      },
      tx
    )
  })
  return { ok: true, teamId: input.teamId }
}
