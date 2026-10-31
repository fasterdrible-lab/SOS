"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Building2, ChevronDown, LogOut, Repeat } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { pageTitle } from "@/lib/navigation"

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Administrador",
  ADMIN: "Administrador",
  CONSULTANT: "Consultor (administrador)",
  MANAGER: "Gestor",
  MEMBER: "Vendedor",
}

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts.at(-1)![0] : (parts[0] ?? "?").slice(0, 2)
  return letters.toUpperCase()
}

export function AppHeader({
  user,
  role,
  organizationName,
}: {
  user: { name: string | null; email: string | null }
  role: string | null
  organizationName: string | null
}) {
  const pathname = usePathname()
  const displayName = user.name || user.email || "Usuário"

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/5 bg-background/80 px-4 backdrop-blur sm:px-6">
      <SidebarTrigger className="text-muted-foreground hover:text-white" />
      <Separator orientation="vertical" className="h-4 opacity-20" />
      <h1 className="truncate text-sm font-medium text-white">{pageTitle(pathname)}</h1>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        {organizationName && (
          <Link
            href="/clientes"
            title="Trocar de cliente"
            className="hidden min-w-0 items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[#D4A64F]/40 hover:text-white sm:flex"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-[#D4A64F]" />
            <span className="max-w-48 truncate">{organizationName}</span>
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-left outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[#D4A64F]"
            aria-label="Menu do usuário"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-[#D4A64F]/15 text-[11px] font-semibold text-[#D4A64F]">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-40 truncate text-sm text-white md:block">
              {displayName}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
                <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
                {user.email && (
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                )}
                <span className="text-xs font-normal text-muted-foreground">
                  {role ? (ROLE_LABELS[role] ?? role) : "Sem cliente ativo"}
                  {organizationName ? ` · ${organizationName}` : ""}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/clientes" />}>
              <Repeat className="h-4 w-4" />
              Trocar de cliente
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut({ redirectTo: "/login" })}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
