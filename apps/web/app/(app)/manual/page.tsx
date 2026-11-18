import Link from "next/link"
import { BookOpen, Search } from "lucide-react"

import { MANUAL_GROUPS, searchArticles } from "@/lib/manual/content"

/** Manual do Usuario (V2-12): indice por grupo e busca, no padrao da EGIDE. */
export default async function ManualPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q
  const query = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 100) ?? ""
  const articles = searchArticles(query)

  return (
    <main className="min-w-0 flex-1 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Manual do Usuário</h1>
          <p className="text-sm text-muted-foreground">
            Como usar cada parte do SalesOS, com passo a passo, exemplos, dúvidas e limitações.
          </p>
        </div>

        <form action="/manual" className="relative rounded-xl border border-foreground/5 bg-card p-3">
          <Search
            className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            aria-label="Buscar no manual"
            placeholder="Buscar no manual (ex.: meta, convite, feriado, report)"
            className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-[#D4A64F]"
          />
        </form>

        {articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada encontrado para “{query}”. Tente outra palavra ou{" "}
            <Link href="/manual" className="text-gold-fg hover:underline">
              veja o manual inteiro
            </Link>
            .
          </p>
        ) : (
          MANUAL_GROUPS.map((group) => {
            const inGroup = articles.filter((article) => article.group === group)
            if (inGroup.length === 0) return null
            return (
              <section key={group} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{group}</h2>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {inGroup.map((article) => (
                    <li key={article.slug}>
                      <Link
                        href={`/manual/${article.slug}`}
                        className="flex h-full gap-3 rounded-xl border border-foreground/5 bg-card p-4 transition-colors hover:border-[#D4A64F]/50"
                      >
                        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-gold-fg" aria-hidden />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">{article.title}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{article.objective}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })
        )}
      </div>
    </main>
  )
}
