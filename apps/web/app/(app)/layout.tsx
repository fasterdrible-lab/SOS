import Link from "next/link"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { getUnseenQualifiedLeadsCount } from "@/lib/sdr/notifications"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  const qualifiedLeadsCount = organizationId
    ? await getUnseenQualifiedLeadsCount(organizationId)
    : 0

  return (
    <SidebarProvider>
      <AppSidebar qualifiedLeadsCount={qualifiedLeadsCount} />
      <SidebarInset className="bg-background">
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
