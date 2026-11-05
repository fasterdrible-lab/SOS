// Notificacoes do cabecalho: derivadas do estado atual, sem tabela propria. Somem
// quando a pendencia e resolvida (lead visto no /sdr, tarefa concluida, etapa movida).

export interface NotificationCounts {
  /** Nulo quando o papel nao acompanha o IA SDR. */
  hotLeads: number | null
  overdueTasks: number
  /** Reunioes, follow-ups e demais atividades com data vencida. */
  overdueActivities: number
  overdueClose: number
  cooling: number
}

export type NotificationKind = "hot-leads" | "overdue-activities" | "overdue-tasks" | "overdue-close" | "cooling"

export interface HeaderNotification {
  kind: NotificationKind
  count: number
  title: string
  href: string
  urgent: boolean
}

export interface HeaderNotifications {
  total: number
  items: HeaderNotification[]
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function buildNotifications(counts: NotificationCounts): HeaderNotifications {
  const candidates: HeaderNotification[] = [
    {
      kind: "hot-leads",
      count: counts.hotLeads ?? 0,
      title: `${plural(counts.hotLeads ?? 0, "lead qualificado", "leads qualificados")} pelo IA SDR`,
      href: "/sdr",
      urgent: true,
    },
    {
      kind: "overdue-activities",
      count: counts.overdueActivities,
      title: plural(counts.overdueActivities, "atividade atrasada", "atividades atrasadas"),
      href: "/atividades",
      urgent: true,
    },
    {
      kind: "overdue-tasks",
      count: counts.overdueTasks,
      title: plural(counts.overdueTasks, "tarefa de plano atrasada", "tarefas de plano atrasadas"),
      href: "/meu-dia",
      urgent: true,
    },
    {
      kind: "overdue-close",
      count: counts.overdueClose,
      title: `${plural(counts.overdueClose, "negociação", "negociações")} com fechamento vencido`,
      href: "/meu-dia",
      urgent: false,
    },
    {
      kind: "cooling",
      count: counts.cooling,
      title: plural(counts.cooling, "negociação esfriando", "negociações esfriando"),
      href: "/meu-dia",
      urgent: false,
    },
  ]

  const items = candidates.filter((item) => item.count > 0)
  return { total: items.reduce((sum, item) => sum + item.count, 0), items }
}
