import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { AUDIT_ACTIONS, auditActionLabel, describeAuditMetadata, isAuditAction } from "../lib/audit/actions.ts"
import { getAccessLevel } from "../lib/authz/permissions.ts"
import {
  ASSIGNABLE_ROLES,
  inviteExpiry,
  inviteState,
  isAdminRole,
  normalizeEmail,
  passwordResetExpiry,
  passwordResetState,
  planPasswordReset,
  planRemoval,
  planRoleChange,
} from "../lib/members/rules.ts"
import { generateInviteToken, hashInviteToken, isInviteTokenShape } from "../lib/members/token.ts"

const NOW = new Date("2026-11-11T12:00:00Z")
const base = { actorUserId: "admin", targetUserId: "outro", adminCount: 2 }

describe("papeis dos membros", () => {
  it("administrador aqui e o mesmo da matriz de permissoes", () => {
    for (const role of ["OWNER", "ADMIN", "CONSULTANT", "MANAGER", "MEMBER", "LIXO"]) {
      assert.equal(isAdminRole(role), getAccessLevel(role) === "ADMIN", role)
    }
    assert.deepEqual([...ASSIGNABLE_ROLES], ["ADMIN", "MANAGER", "MEMBER"])
  })

  it("ninguem muda o proprio papel nem repete o atual", () => {
    assert.equal(planRoleChange({ ...base, targetUserId: "admin", currentRole: "ADMIN", newRole: "MEMBER" }).ok, false)
    assert.equal(planRoleChange({ ...base, currentRole: "MANAGER", newRole: "MANAGER" }).code, "CONFLICT")
    assert.equal(planRoleChange({ ...base, currentRole: "MEMBER", newRole: "MANAGER" }).ok, true)
  })

  it("a organizacao nunca fica sem administrador", () => {
    const last = { ...base, adminCount: 1 }
    assert.equal(planRoleChange({ ...last, currentRole: "CONSULTANT", newRole: "MANAGER" }).ok, false)
    assert.equal(planRoleChange({ ...last, currentRole: "CONSULTANT", newRole: "ADMIN" }).ok, true)
    assert.equal(planRoleChange({ ...base, currentRole: "ADMIN", newRole: "MEMBER" }).ok, true)
    assert.equal(planRemoval({ ...last, currentRole: "OWNER" }).ok, false)
    assert.equal(planRemoval({ ...last, currentRole: "MEMBER" }).ok, true)
  })

  it("ninguem remove a si mesmo", () => {
    assert.equal(planRemoval({ ...base, targetUserId: "admin", currentRole: "ADMIN" }).code, "UNPROCESSABLE")
  })
})

describe("convites", () => {
  it("vale 7 dias e o estado segue aceito > revogado > expirado", () => {
    const expiresAt = inviteExpiry(NOW)
    assert.equal(expiresAt.toISOString(), "2026-11-18T12:00:00.000Z")
    const open = { acceptedAt: null, revokedAt: null, expiresAt }
    assert.equal(inviteState(open, NOW), "PENDING")
    assert.equal(inviteState(open, expiresAt), "EXPIRED")
    assert.equal(inviteState({ ...open, revokedAt: NOW }, NOW), "REVOKED")
    assert.equal(inviteState({ ...open, acceptedAt: NOW, revokedAt: NOW }, NOW), "ACCEPTED")
  })

  it("token de 256 bits, guardado so como hash", () => {
    const token = generateInviteToken()
    assert.ok(isInviteTokenShape(token))
    assert.notEqual(generateInviteToken(), token)
    assert.match(hashInviteToken(token), /^[0-9a-f]{64}$/)
    assert.equal(hashInviteToken(token), hashInviteToken(token))
    assert.equal(isInviteTokenShape("curto"), false)
    assert.equal(isInviteTokenShape(`${token.slice(0, 42)}/`), false)
  })

  it("e-mail sem espacos e em minusculas", () => {
    assert.equal(normalizeEmail("  Ana.Souza@Empresa.COM "), "ana.souza@empresa.com")
  })
})

describe("nova senha", () => {
  it("link vale 24 horas e uma vez", () => {
    const expiresAt = passwordResetExpiry(NOW)
    assert.equal(expiresAt.toISOString(), "2026-11-12T12:00:00.000Z")
    const open = { usedAt: null, revokedAt: null, expiresAt }
    assert.equal(passwordResetState(open, NOW), "PENDING")
    assert.equal(passwordResetState(open, expiresAt), "EXPIRED")
    assert.equal(passwordResetState({ ...open, revokedAt: NOW }, NOW), "REVOKED")
    assert.equal(passwordResetState({ ...open, usedAt: NOW, revokedAt: NOW }, NOW), "USED")
  })

  it("so para conta que pertence apenas a esta organizacao", () => {
    assert.equal(planPasswordReset({ membershipCount: 1 }).ok, true)
    assert.equal(planPasswordReset({ membershipCount: 2 }).code, "UNPROCESSABLE")
  })
})

describe("auditoria", () => {
  it("toda acao tem rotulo e desconhecida aparece crua", () => {
    assert.ok(AUDIT_ACTIONS.includes("member.role-changed"))
    assert.equal(isAuditAction("member.removed"), true)
    assert.equal(isAuditAction("toString"), false)
    assert.equal(auditActionLabel("member.joined"), "Convite aceito")
    assert.equal(auditActionLabel("acao.antiga"), "acao.antiga")
  })

  it("detalhes em uma linha", () => {
    assert.equal(describeAuditMetadata({ from: "MEMBER", to: "MANAGER" }), "from: MEMBER · to: MANAGER")
    assert.equal(describeAuditMetadata({ fields: ["title", "value"] }), "fields: title, value")
    assert.equal(describeAuditMetadata(null), "")
    assert.equal(describeAuditMetadata(["x"]), "")
  })
})
