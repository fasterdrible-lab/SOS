import { cookies } from "next/headers"
import Link from "next/link"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { getHeaderNotifications } from "@/lib/notifications/summary"
import { getUnseenQualifiedLeadsCount } from "@/lib/sdr/notifications"
import { THEME_COOKIE, parseTheme } from "@/lib/theme"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  const userId = session?.user?.id
  const role = session?.user?.role ?? null
  const teamId = session?.user?.teamId ?? null
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value)

  const [qualifiedLeadsCount, organization, notifications] = organizationId && userId
    ? await Promise.all([
        hasPermission(role, "sdr:read") ? getUnseenQualifiedLeadsCount(organizationId) : 0,
        prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true },
        }),
        hasPermission(role, "my-day:read")
          ? getHeaderNotifications({ organizationId, userId, role, teamId })
          : null,
      ])
    : [0, null, null]

  return (
    <SidebarProvider>
      <AppSidebar qualifiedLeadsCount={qualifiedLeadsCount} role={role} />
      <SidebarInset className="min-w-0 bg-background">
        <AppHeader
          user={{ name: session?.user?.name ?? null, email: session?.user?.email ?? null }}
          role={role}
          organizationName={organization?.name ?? null}
          notifications={notifications}
          theme={theme}
        />
        {!organizationId && (
          <div className="border-b border-[#D4A64F]/30 bg-[#D4A64F]/10 px-6 py-3 text-sm text-foreground">
            Nenhum cliente ativo. Os dados ficam dentro de um cliente:{" "}
            <Link href="/clientes" className="font-medium text-gold-fg hover:text-gold-fg/80">
              crie ou acesse um em Meus Clientes
            </Link>{" "}
            para começar.
          </div>
        )}
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
