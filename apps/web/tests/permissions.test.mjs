import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  canCreateOrganization,
  getAccessLevel,
  hasPermission,
  opportunityScope,
} from "../lib/authz/permissions.ts"

describe("papeis", () => {
  it("mapeia cada papel do banco para um nivel", () => {
    assert.equal(getAccessLevel("OWNER"), "ADMIN")
    assert.equal(getAccessLevel("ADMIN"), "ADMIN")
    assert.equal(getAccessLevel("CONSULTANT"), "ADMIN")
    assert.equal(getAccessLevel("MANAGER"), "MANAGER")
    assert.equal(getAccessLevel("MEMBER"), "SELLER")
  })

  it("nao concede acesso a papel ausente ou desconhecido", () => {
    for (const role of [null, undefined, "", "ROOT", "admin", "constructor"]) {
      assert.equal(getAccessLevel(role), null)
      assert.equal(hasPermission(role, "crm:read"), false)
    }
  })
})

describe("matriz de permissoes", () => {
  it("restringe integracoes ao administrador", () => {
    assert.equal(hasPermission("CONSULTANT", "integrations:manage"), true)
    assert.equal(hasPermission("MANAGER", "integrations:manage"), false)
    assert.equal(hasPermission("MEMBER", "integrations:manage"), false)
  })

  it("restringe planos, IA SDR e Consultor a gestor e administrador", () => {
    for (const permission of ["action-plans:write", "sdr:read", "consultant:use"]) {
      assert.equal(hasPermission("ADMIN", permission), true)
      assert.equal(hasPermission("MANAGER", permission), true)
      assert.equal(hasPermission("MEMBER", permission), false)
    }
  })

  it("mantem a operacao comercial disponivel ao vendedor", () => {
    for (const permission of [
      "crm:read",
      "crm:write",
      "opportunities:read",
      "opportunities:write",
      "diagnostics:write",
      "action-plans:read",
      "action-tasks:update-status",
    ]) {
      assert.equal(hasPermission("MEMBER", permission), true)
    }
  })
})

describe("escopo de oportunidades", () => {
  it("nao limita gestor nem administrador", () => {
    assert.deepEqual(opportunityScope("CONSULTANT", "u1"), {})
    assert.deepEqual(opportunityScope("MANAGER", "u1"), {})
  })

  it("limita o vendedor as proprias", () => {
    assert.deepEqual(opportunityScope("MEMBER", "u1"), { ownerId: "u1" })
  })

  it("nao devolve nada para papel desconhecido", () => {
    const scope = opportunityScope(null, "u1")
    assert.ok(scope.ownerId)
    assert.notEqual(scope.ownerId, "u1")
  })
})

describe("criar organizacao", () => {
  it("permite o primeiro acesso, sem nenhum vinculo", () => {
    assert.equal(canCreateOrganization([]), true)
  })

  it("permite quem administra alguma organizacao", () => {
    assert.equal(canCreateOrganization(["MEMBER", "CONSULTANT"]), true)
  })

  it("bloqueia quem e apenas gestor ou vendedor", () => {
    assert.equal(canCreateOrganization(["MEMBER"]), false)
    assert.equal(canCreateOrganization(["MANAGER", "MEMBER"]), false)
  })
})
