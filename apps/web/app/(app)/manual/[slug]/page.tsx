import type { ReactNode } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, PlayCircle } from "lucide-react"

import { findArticle } from "@/lib/manual/content"

function Block({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">
        {number}. {title}
      </h2>
      <div className="text-sm text-muted-foreground">{children}</div>
    </section>
  )
}

/** Um assunto do manual, com os 9 itens e o espaco do video (padrao EGIDE). */
export default async function ManualArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = findArticle(slug)
  if (!article) notFound()

  return (
    <main className="min-w-0 flex-1 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/manual" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Manual do Usuário
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{article.group}</p>
          <h1 className="text-lg font-semibold text-foreground">{article.title}</h1>
          <p className="text-xs text-muted-foreground">Para: {article.audience}</p>
        </div>

        <div className="space-y-5 rounded-xl border border-foreground/5 bg-card p-5">
          <Block number={1} title="Objetivo">
            <p>{article.objective}</p>
          </Block>
          <Block number={2} title="Quando utilizar">
            <p>{article.whenToUse}</p>
          </Block>
          <Block number={3} title="Como acessar">
            <p>{article.access}</p>
            <Link
              href={article.path}
              className="mt-1 inline-flex items-center gap-1 font-medium text-gold-fg hover:underline"
            >
              Abrir a tela <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Block>
          <Block number={4} title="Passo a passo">
            <ol className="list-decimal space-y-1 pl-5">
              {article.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </Block>
          <Block number={5} title="Exemplo prático">
            <p>{article.example}</p>
          </Block>
          <Block number={6} title="Resultados esperados">
            <p>{article.results}</p>
          </Block>
          <Block number={7} title="Principais dúvidas">
            <dl className="space-y-2">
              {article.faq.map((item) => (
                <div key={item.question}>
                  <dt className="font-medium text-foreground">{item.question}</dt>
                  <dd>{item.answer}</dd>
                </div>
              ))}
            </dl>
          </Block>
          <Block number={8} title="Erros comuns">
            <ul className="space-y-2">
              {article.commonErrors.map((item) => (
                <li key={item.problem}>
                  <span className="font-medium text-foreground">{item.problem}</span> {item.solution}
                </li>
              ))}
            </ul>
          </Block>
          <Block number={9} title="Limitações">
            <ul className="list-disc space-y-1 pl-5">
              {article.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Block>
        </div>

        <div className="space-y-3 rounded-xl border border-foreground/5 bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <PlayCircle className="h-4 w-4 text-gold-fg" aria-hidden /> Vídeo: {article.video.title}
          </h2>
          {article.video.embedUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-md border border-foreground/10">
              <iframe
                src={article.video.embedUrl}
                title={article.video.title}
                className="h-full w-full"
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Vídeo demonstrativo em preparação.</p>
          )}
        </div>
      </div>
    </main>
  )
}
