import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { OPPORTUNITY_STAGES } from "@/lib/validations/opportunity"

import { OpportunityCard, type OpportunityCardData } from "./opportunity-card"
import { OpportunityFormDialog } from "./opportunity-form-dialog"

const STAGE_LABELS: Record<(typeof OPPORTUNITY_STAGES)[number], string> = {
  PROSPECTING: "Prospeccao",
  QUALIFICATION: "Qualificacao",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociacao",
  CLOSED_WON: "Fechado (Ganho)",
  CLOSED_LOST: "Fechado (Perdido)",
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})

export default async function PipelinePage() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  const [opportunities, companies, contacts] = organizationId
    ? await Promise.all([
        prisma.opportunity.findMany({
          where: { organizationId },
          include: {
            company: { select: { id: true, name: true } },
            contact: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.company.findMany({
          where: { organizationId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.contact.findMany({
          where: { organizationId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], [], []]

  const columns = OPPORTUNITY_STAGES.map((stage) => {
    const items: OpportunityCardData[] = opportunities
      .filter((opportunity) => opportunity.stage === stage)
      .map((opportunity) => ({
        id: opportunity.id,
        title: opportunity.title,
        value: opportunity.value,
        stage: opportunity.stage,
        companyName: opportunity.company?.name ?? null,
        contactName: opportunity.contact?.name ?? null,
      }))

    const total = items.reduce((sum, item) => sum + item.value, 0)

    return { stage, items, total }
  })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/5 bg-background/80 px-6 backdrop-blur">
        <SidebarTrigger className="text-muted-foreground hover:text-white" />
        <Separator orientation="vertical" className="h-4 opacity-20" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Pipeline</span>
          <Badge
            variant="outline"
            className="border-[#D4A64F]/30 bg-[#D4A64F]/5 text-[10px] text-[#D4A64F]"
          >
            CRM
          </Badge>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Pipeline de Oportunidades
              </h1>
              <p className="text-sm text-muted-foreground">
                Acompanhe as oportunidades da sua organizacao por estagio.
              </p>
            </div>
            <OpportunityFormDialog companies={companies} contacts={contacts} />
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map((column) => (
              <div
                key={column.stage}
                className="w-72 shrink-0 rounded-xl border border-white/5 bg-card"
              >
                <div className="border-b border-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {STAGE_LABELS[column.stage]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {column.items.length}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {currencyFormatter.format(column.total)}
                  </span>
                </div>

                <div className="space-y-2 p-2">
                  {column.items.length === 0 ? (
                    <p className="p-2 text-center text-xs text-muted-foreground">
                      Nenhuma oportunidade
                    </p>
                  ) : (
                    column.items.map((item) => (
                      <OpportunityCard key={item.id} opportunity={item} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
