import Link from "next/link"

import { AccessDenied } from "@/components/access-denied"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AUDIT_ACTION_LABELS, AUDIT_ACTIONS } from "@/lib/audit/actions"
import { listAuditActors, listAuditLog } from "@/lib/audit/query"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"

import { SettingsNav } from "../settings-nav"

const selectClass =
  "h-8 rounded-lg border border-foreground/10 bg-card px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#D4A64F]"

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
})

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ""

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!organizationId) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Acesse um cliente para ver a auditoria.
      </main>
    )
  }
  if (!hasPermission(session.user.role, "audit:read")) return <AccessDenied />

  const params = await searchParams
  const action = first(params.acao)
  const actorId = first(params.pessoa)
  const cursor = first(params.depois)

  const [{ entries, nextCursor }, actors] = await Promise.all([
    listAuditLog({ organizationId, action, actorId, cursor }),
    listAuditActors(organizationId),
  ])

  const nextHref = nextCursor
    ? `/configuracoes/auditoria?${new URLSearchParams({
        ...(action ? { acao: action } : {}),
        ...(actorId ? { pessoa: actorId } : {}),
        depois: nextCursor,
      })}`
    : null

  return (
    <main className="min-w-0 flex-1 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <SettingsNav active="auditoria" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Auditoria</h1>
          <p className="text-sm text-muted-foreground">
            Operações sensíveis feitas nesta organização: quem fez, quando e o quê. Senhas, chaves e textos nunca são
            gravados aqui.
          </p>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Ação</span>
            <select name="acao" defaultValue={action} className={selectClass}>
              <option value="">Todas</option>
              {AUDIT_ACTIONS.map((key) => (
                <option key={key} value={key}>
                  {AUDIT_ACTION_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Pessoa</span>
            <select name="pessoa" defaultValue={actorId} className={selectClass}>
              <option value="">Todas</option>
              {actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="outline" size="sm">
            Filtrar
          </Button>
          {(action || actorId || cursor) && (
            <Link href="/configuracoes/auditoria" className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground">
              Limpar
            </Link>
          )}
        </form>

        <Card className="border-foreground/5 bg-card py-0">
          <CardContent className="p-5">
            {entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma operação registrada com esses filtros.</p>
            ) : (
              <ul className="divide-y divide-foreground/5">
                {entries.map((entry) => (
                  <li key={entry.id} className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]">
                    <time dateTime={entry.createdAt} className="text-xs text-muted-foreground">
                      {dateTime.format(new Date(entry.createdAt))}
                    </time>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{entry.label}</span>
                        <span className="text-muted-foreground"> · {entry.actor?.name ?? "Pessoa removida"}</span>
                      </p>
                      {entry.details && <p className="break-words text-xs text-muted-foreground">{entry.details}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {nextHref && (
              <div className="pt-3 text-center">
                <Link href={nextHref} className="text-sm text-gold-fg hover:underline">
                  Ver mais antigas
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
