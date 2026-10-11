import { notFound } from "next/navigation"

import { prisma } from "@/lib/db"

import { SdrChatWidget } from "./chat-widget"

export default async function SdrWidgetPage({
  params,
}: {
  params: Promise<{ organizationId: string }>
}) {
  const { organizationId } = await params

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  })

  if (!organization) {
    notFound()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1E1B3A] p-4">
      <SdrChatWidget
        organizationId={organization.id}
        organizationName={organization.name}
      />
    </main>
  )
}
