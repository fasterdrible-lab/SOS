import Link from "next/link"

import { AccessDenied } from "@/components/access-denied"
import { Card, CardContent } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import { getAccessLevel, hasPermission } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { listSaleiaMeetings } from "@/lib/saleia/service"
import { cn } from "@/lib/utils"

import { formatMeetingDate, MeetingList } from "./meeting-list"

const LIMIT = 200

export default async function SaleiaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  const organizationId = session?.user?.organizationId
  const userId = session?.user?.id

  if (!organizationId || !userId) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Acesse um cliente para ver as reuniões do SALEIA.
      </main>
    )
  }

  const role = session.user.role
  if (!hasPermission(role, "saleia:read")) return <AccessDenied />

  const isSeller = getAccessLevel(role) === "SELLER"
  const unlinked = !isSeller && (await searchParams).vinculo === "sem"

  const [meetings, integration] = await Promise.all([
    listSaleiaMeetings({
      organizationId,
      userId,
      role,
      teamId: session.user.teamId,
      where: unlinked ? { companyId: null } : undefined,
      take: LIMIT,
    }),
    prisma.saleiaIntegration.findUnique({ where: { organizationId }, select: { lastEventAt: true } }),
  ])

  const tab = (active: boolean) =>
    cn(
      "rounded-md px-2.5 py-1 text-sm transition-colors",
      active ? "bg-[#D4A64F]/15 text-gold-fg" : "text-muted-foreground hover:text-foreground"
    )

  return (
    <main className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">SALEIA</h1>
          <p className="text-sm text-muted-foreground">
            {isSeller
              ? "Reuniões analisadas pelo SALEIA nas suas negociações."
              : "Reuniões analisadas pelo SALEIA, com resumo, recomendações e evidências."}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {integration
            ? integration.lastEventAt
              ? `Última reunião recebida em ${formatMeetingDate(integration.lastEventAt.toISOString())}`
              : "Conectado, aguardando a primeira reunião."
            : "Integração não conectada."}
        </p>
      </div>

      {!isSeller && (
        <div className="flex gap-1 rounded-xl border border-foreground/5 bg-card p-1" role="group" aria-label="Vínculo">
          <Link href="/saleia" className={tab(!unlinked)} aria-current={!unlinked ? "page" : undefined}>
            Todas
          </Link>
          <Link href="/saleia?vinculo=sem" className={tab(unlinked)} aria-current={unlinked ? "page" : undefined}>
            Sem empresa
          </Link>
        </div>
      )}

      {meetings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-foreground/10 p-8 text-center text-sm text-muted-foreground">
          {integration || isSeller
            ? "Nenhuma reunião recebida."
            : hasPermission(role, "integrations:manage")
              ? <>Conecte o SALEIA em <Link href="/configuracoes" className="text-gold-fg hover:underline">Configurações</Link> para receber as reuniões analisadas.</>
              : "Peça a um administrador para conectar o SALEIA."}
        </p>
      ) : (
        <Card className="border-foreground/5 bg-card py-0">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Reuniões ({meetings.length}
              {meetings.length === LIMIT ? "+" : ""})
            </h2>
            <MeetingList meetings={meetings} />
          </CardContent>
        </Card>
      )}
    </main>
  )
}
