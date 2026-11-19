"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { BrandMark } from "@/components/brand"
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
import { hasPermission } from "@/lib/authz/permissions"
import { MANUAL_ITEM, NAV_GROUPS, SETTINGS_ITEM, isActivePath, type NavItem } from "@/lib/navigation"
import { cn } from "@/lib/utils"

function canSee(item: NavItem, role: string | null) {
  return !item.permission || hasPermission(role, item.permission)
}

export function AppSidebar({
  qualifiedLeadsCount = 0,
  role,
}: {
  qualifiedLeadsCount?: number
  role: string | null
}) {
  const pathname = usePathname()

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSee(item, role)),
  })).filter((group) => group.items.length > 0)

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <BrandMark size={32} />
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-foreground text-sm">SaleOS</span>
            <span className="text-[10px] text-muted-foreground">Operating System</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="opacity-20" />

      <SidebarContent className="px-2 py-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="mb-1">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = isActivePath(pathname, item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.href} />}
                      className={cn(
                        "rounded-md transition-all",
                        isActive
                          ? "bg-[#D4A64F]/10 text-gold-fg font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
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
          {[SETTINGS_ITEM, MANUAL_ITEM]
            .filter((item) => canSee(item, role))
            .map((item) => {
              const isActive = isActivePath(pathname, item.href)
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.title}
                    render={<Link href={item.href} />}
                    className={cn(
                      "rounded-md",
                      isActive
                        ? "bg-[#D4A64F]/10 text-gold-fg font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
