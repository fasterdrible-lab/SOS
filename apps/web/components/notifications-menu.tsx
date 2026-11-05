"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlarmClock, Bell, CalendarClock, CalendarX, Flame, Snowflake, type LucideIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { HeaderNotifications, NotificationKind } from "@/lib/notifications/build"

const ICONS: Record<NotificationKind, LucideIcon> = {
  "hot-leads": Flame,
  "overdue-activities": CalendarClock,
  "overdue-tasks": AlarmClock,
  "overdue-close": CalendarX,
  cooling: Snowflake,
}

export function NotificationsMenu({ initial }: { initial: HeaderNotifications }) {
  const pathname = usePathname()
  const [notifications, setNotifications] = useState(initial)

  // O layout nao e renderizado de novo ao navegar: atualiza a cada troca de
  // pagina e quando a janela volta ao foco.
  useEffect(() => {
    const controller = new AbortController()

    async function refresh() {
      try {
        const response = await fetch("/api/notifications", { signal: controller.signal })
        if (!response.ok) return
        const body = (await response.json()) as { notifications: HeaderNotifications }
        setNotifications(body.notifications)
      } catch {
        // Sem rede ou navegacao cancelada: mantem a ultima contagem.
      }
    }

    refresh()
    window.addEventListener("focus", refresh)
    return () => {
      controller.abort()
      window.removeEventListener("focus", refresh)
    }
  }, [pathname])

  const { total, items } = notifications
  const label = total > 0 ? `Notificações (${total})` : "Notificações"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        title={label}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#D4A64F]"
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D4A64F] px-1 text-[10px] font-semibold text-[#1E1B3A]">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs">Notificações</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Nada pendente por aqui.</p>
        ) : (
          items.map((item) => {
            const Icon = ICONS[item.kind]
            return (
              <DropdownMenuItem key={item.kind} render={<Link href={item.href} />}>
                <Icon className={item.urgent ? "h-4 w-4 text-red-600 dark:text-red-400" : "h-4 w-4 text-gold-fg"} />
                <span className="text-sm">{item.title}</span>
              </DropdownMenuItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
