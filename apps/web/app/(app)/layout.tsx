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
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
