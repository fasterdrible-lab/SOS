import Link from "next/link"

import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { prisma } from "@/lib/db"
import { getUnseenQualifiedLeadsCount } from "@/lib/sdr/notifications"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  const role = session?.user?.role ?? null

  const [qualifiedLeadsCount, organization] = organizationId
    ? await Promise.all([
        hasPermission(role, "sdr:read") ? getUnseenQualifiedLeadsCount(organizationId) : 0,
        prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true },
        }),
      ])
    : [0, null]

  return (
    <SidebarProvider>
      <AppSidebar qualifiedLeadsCount={qualifiedLeadsCount} role={role} />
      <SidebarInset className="min-w-0 bg-background">
        <AppHeader
          user={{ name: session?.user?.name ?? null, email: session?.user?.email ?? null }}
          role={role}
          organizationName={organization?.name ?? null}
        />
        {!organizationId && (
          <div className="border-b border-[#D4A64F]/30 bg-[#D4A64F]/10 px-6 py-3 text-sm text-white">
            Nenhum cliente ativo. Os dados ficam dentro de um cliente:{" "}
            <Link href="/clientes" className="font-medium text-[#D4A64F] hover:text-[#E0B85A]">
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
