import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

import { DiagnosticWizard } from "./wizard"

export default function DiagnosticoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/5 bg-background/80 px-6 backdrop-blur">
        <SidebarTrigger className="text-muted-foreground hover:text-white" />
        <Separator orientation="vertical" className="h-4 opacity-20" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Diagnostico</span>
          <Badge
            variant="outline"
            className="border-[#D4A64F]/30 bg-[#D4A64F]/5 text-[10px] text-[#D4A64F]"
          >
            Fase 2
          </Badge>
        </div>
      </header>

      <main className="flex-1 p-6">
        <DiagnosticWizard />
      </main>
    </div>
  )
}
