import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

import { findArticle, MANUAL_ARTICLES, MANUAL_GROUPS, searchArticles } from "../lib/manual/content.ts"

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app", "(app)")

describe("manual do usuario (V2-12)", () => {
  it("cada artigo tem slug unico e grupo conhecido", () => {
    const slugs = MANUAL_ARTICLES.map((article) => article.slug)
    assert.equal(new Set(slugs).size, slugs.length)
    for (const article of MANUAL_ARTICLES) {
      assert.match(article.slug, /^[a-z0-9-]+$/, article.slug)
      assert.ok(MANUAL_GROUPS.includes(article.group), `${article.slug}: grupo ${article.group}`)
    }
  })

  it("cada artigo aponta para uma tela que existe", () => {
    for (const article of MANUAL_ARTICLES) {
      const page = path.join(APP, ...article.path.split("/").filter(Boolean), "page.tsx")
      assert.ok(existsSync(page), `${article.slug}: ${article.path} sem pagina`)
    }
  })

  it("cada artigo preenche os 9 itens", () => {
    for (const article of MANUAL_ARTICLES) {
      for (const field of ["title", "audience", "access", "objective", "whenToUse", "example", "results"]) {
        assert.ok(article[field].trim().length > 0, `${article.slug}: ${field} vazio`)
      }
      assert.ok(article.steps.length >= 2, `${article.slug}: passo a passo`)
      assert.ok(article.faq.length >= 1, `${article.slug}: duvidas`)
      assert.ok(article.commonErrors.length >= 1, `${article.slug}: erros comuns`)
      assert.ok(article.limitations.length >= 1, `${article.slug}: limitacoes`)
      assert.ok(article.video.title.length > 0, `${article.slug}: video`)
    }
  })

  it("todo grupo tem ao menos um artigo", () => {
    for (const group of MANUAL_GROUPS) {
      assert.ok(MANUAL_ARTICLES.some((article) => article.group === group), group)
    }
  })

  it("busca sem acento nem maiusculas, com todas as palavras", () => {
    assert.ok(searchArticles("CONFIGURACOES comerciais").some((article) => article.slug === "configuracoes-comerciais"))
    assert.ok(searchArticles("feriado").some((article) => article.slug === "configuracoes-comerciais"))
    assert.deepEqual(searchArticles("palavra-que-nao-existe-no-manual"), [])
    assert.equal(searchArticles("   ").length, MANUAL_ARTICLES.length)
  })

  it("findArticle acha pelo slug e devolve undefined para o desconhecido", () => {
    assert.equal(findArticle("equipes")?.title, "Equipes")
    assert.equal(findArticle("nao-existe"), undefined)
    assert.equal(findArticle(undefined), undefined)
  })
})
