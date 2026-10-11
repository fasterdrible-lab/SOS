"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Target,
  Zap,
  BrainCircuit,
  BarChart3,
  BookOpen,
  ClipboardList,
  TrendingUp,
  Settings,
  ChevronRight,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const navItems = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Diagnóstico", href: "/diagnostico", icon: ClipboardList },
    ],
  },
  {
    label: "CRM",
    items: [
      { title: "Pipeline", href: "/pipeline", icon: Target },
      { title: "Empresas", href: "/empresas", icon: Users },
      { title: "Contatos", href: "/contatos", icon: Users },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { title: "IA SDR", href: "/sdr", icon: Zap },
      { title: "Consultor Digital", href: "/consultor", icon: BrainCircuit },
      { title: "Plano de Ação", href: "/planos", icon: ClipboardList },
    ],
  },
  {
    label: "Consultoria",
    items: [
      { title: "Meus Clientes", href: "/clientes", icon: BarChart3 },
      { title: "Academia", href: "/academia", icon: BookOpen },
    ],
  },
]

export function AppSidebar({
  qualifiedLeadsCount = 0,
}: {
  qualifiedLeadsCount?: number
}) {
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D4A64F] flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-[#1E1B3A]" />
          </div>
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-white text-sm">SalesOS</span>
            <span className="text-[10px] text-muted-foreground">Revenue Growth</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="opacity-20" />

      <SidebarContent className="px-2 py-2">
        {navItems.map((group) => (
          <SidebarGroup key={group.label} className="mb-1">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      className={cn(
                        "rounded-md transition-all",
                        isActive
                          ? "bg-[#D4A64F]/10 text-[#D4A64F] font-medium"
                          : "text-muted-foreground hover:text-white hover:bg-white/5"
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                      {item.href === "/sdr" && qualifiedLeadsCount > 0 ? (
                        <Badge className="ml-auto h-4 min-w-4 justify-center rounded-full bg-[#D4A64F] px-1 text-[10px] text-[#1E1B3A]">
                          {qualifiedLeadsCount}
                        </Badge>
                      ) : (
                        isActive && <ChevronRight className="ml-auto w-3 h-3 opacity-60" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-2 py-3">
        <SidebarSeparator className="opacity-20 mb-3" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/configuracoes" />}
              className="text-muted-foreground hover:text-white hover:bg-white/5 rounded-md"
            >
              <Settings className="w-4 h-4" />
              <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
