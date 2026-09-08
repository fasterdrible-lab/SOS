import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from "lucide-react"

import { auth } from "@/lib/auth"
import { getExecutiveKpis, type ExecutiveKpis } from "@/lib/dashboard/kpis"

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
})

function formatPctChange(value: number): string {
  const sign = value >= 0 ? "+" : "-"
  return `${sign}${Math.abs(value).toFixed(0)}%`
}

function formatPpChange(value: number): string {
  const sign = value >= 0 ? "+" : "-"
  return `${sign}${Math.abs(value).toFixed(1)}pp`
}

function buildKpiCards(kpis: ExecutiveKpis) {
  return [
    {
      title: "Pipeline Total",
      value: currencyFormatter.format(kpis.pipelineTotal),
      change: formatPctChange(kpis.pipelineChangePct),
      positive: kpis.pipelineChangePct >= 0,
      icon: DollarSign,
      sub: "em oportunidades abertas",
    },
    {
      title: "Leads Ativos",
      value: String(kpis.activeLeads),
      change: formatPctChange(kpis.leadsChangePct),
      positive: kpis.leadsChangePct >= 0,
      icon: Users,
      sub: "em qualificação",
    },
    {
      title: "Oportunidades",
      value: String(kpis.openOpportunities),
      change: formatPctChange(kpis.opportunitiesChangePct),
      positive: kpis.opportunitiesChangePct >= 0,
      icon: Target,
      sub: "em negociação",
    },
    {
      title: "Taxa de Conversão",
      value: `${kpis.conversionRate.toFixed(1)}%`,
      change: formatPpChange(kpis.conversionChangePp),
      positive: kpis.conversionChangePp >= 0,
      icon: TrendingUp,
      sub: "vs mês anterior",
    },
  ]
}

const emptyKpis: ExecutiveKpis = {
  pipelineTotal: 0,
  pipelineChangePct: 0,
  activeLeads: 0,
  leadsChangePct: 0,
  openOpportunities: 0,
  opportunitiesChangePct: 0,
  conversionRate: 0,
  conversionChangePp: 0,
}

export default async function DashboardPage() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  const kpis = organizationId
    ? await getExecutiveKpis(organizationId)
    : emptyKpis

  const kpiCards = buildKpiCards(kpis)

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 h-14 border-b border-white/5 sticky top-0 bg-background/80 backdrop-blur z-10">
        <SidebarTrigger className="text-muted-foreground hover:text-white" />
        <Separator orientation="vertical" className="h-4 opacity-20" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Dashboard</span>
          <Badge
            variant="outline"
            className="text-[10px] border-[#D4A64F]/30 text-[#D4A64F] bg-[#D4A64F]/5"
          >
            Beta
          </Badge>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Bom dia</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Aqui está o resumo da sua operação comercial.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 rounded-lg px-3 py-2 border border-white/5">
            <Zap className="w-3.5 h-3.5 text-[#D4A64F]" />
            <span>IA Consultor ativo</span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => (
            <Card
              key={kpi.title}
              className="bg-card border-white/5 hover:border-white/10 transition-colors"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {kpi.title}
                </CardTitle>
                <div className="w-8 h-8 rounded-md bg-[#D4A64F]/10 flex items-center justify-center">
                  <kpi.icon className="w-4 h-4 text-[#D4A64F]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{kpi.value}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`text-xs font-medium flex items-center gap-0.5 ${
                      kpi.positive ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {kpi.positive ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {kpi.change}
                  </span>
                  <span className="text-xs text-muted-foreground">{kpi.sub}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state - Diagnóstico CTA */}
        <Card className="bg-card border-white/5 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#D4A64F]/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-7 h-7 text-[#D4A64F]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Comece com um Diagnóstico Comercial
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mb-6">
              O SalesOS analisa sua operação atual e gera um plano de crescimento
              personalizado com base nos seus dados.
            </p>
            <a
              href="/diagnostico"
              className="inline-flex items-center gap-2 bg-[#D4A64F] hover:bg-[#E0B85A] text-[#1E1B3A] font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Iniciar Diagnóstico
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
