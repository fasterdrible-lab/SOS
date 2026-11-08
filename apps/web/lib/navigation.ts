import {
  BarChart3,
  Building2,
  BrainCircuit,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  Settings,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react"

import type { Permission } from "@/lib/authz/permissions"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  /** Sem a permissao, o item nao aparece no menu. */
  permission?: Permission
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

// Modulos entram no menu quando tiverem tela; nenhum item leva a pagina inexistente.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operação",
    items: [
      { title: "Meu Dia", href: "/meu-dia", icon: CalendarCheck },
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Negociações", href: "/pipeline", icon: KanbanSquare },
      { title: "Atividades", href: "/atividades", icon: ListTodo },
      { title: "Report", href: "/report", icon: ClipboardCheck, permission: "reports:read" },
    ],
  },
  {
    label: "CRM",
    items: [
      { title: "Empresas", href: "/empresas", icon: Building2 },
      { title: "Contatos", href: "/contatos", icon: Users },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { title: "SALEIA", href: "/saleia", icon: Sparkles, permission: "saleia:read" },
      { title: "IA SDR", href: "/sdr", icon: Zap, permission: "sdr:read" },
      {
        title: "Consultor Digital",
        href: "/consultor",
        icon: BrainCircuit,
        permission: "consultant:use",
      },
    ],
  },
  {
    label: "Consultoria",
    items: [
      { title: "Diagnóstico", href: "/diagnostico", icon: ClipboardList },
      { title: "Plano de Ação", href: "/planos", icon: ListChecks },
      { title: "Meus Clientes", href: "/clientes", icon: BarChart3 },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = {
  title: "Configurações",
  href: "/configuracoes",
  icon: Settings,
  permission: "integrations:manage",
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/")
}

/** Titulo do cabecalho: o item de menu de rota mais especifica. */
export function pageTitle(pathname: string): string {
  const items = [...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_ITEM]
  const match = items
    .filter((item) => isActivePath(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return match?.title ?? "SalesOS"
}
