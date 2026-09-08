import { Building2 } from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { CompanyFormDialog } from "./company-form-dialog"

export default async function EmpresasPage() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  const companies = organizationId
    ? await prisma.company.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
      })
    : []

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/5 bg-background/80 px-6 backdrop-blur">
        <SidebarTrigger className="text-muted-foreground hover:text-white" />
        <Separator orientation="vertical" className="h-4 opacity-20" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Empresas</span>
          <Badge
            variant="outline"
            className="border-[#D4A64F]/30 bg-[#D4A64F]/5 text-[10px] text-[#D4A64F]"
          >
            CRM
          </Badge>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Empresas</h1>
              <p className="text-sm text-muted-foreground">
                Contas cadastradas na sua organizacao.
              </p>
            </div>
            <CompanyFormDialog />
          </div>

          <Card className="border-white/5 bg-card">
            <CardContent className="p-0">
              {companies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4A64F]/10">
                    <Building2 className="h-7 w-7 text-[#D4A64F]" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    Nenhuma empresa cadastrada
                  </h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Cadastre a primeira empresa para comecar a organizar suas
                    contas e oportunidades.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">
                        Nome
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Segmento
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Contato
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Criada em
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id} className="border-white/5">
                        <TableCell className="font-medium text-white">
                          {company.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {company.segment ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {company.email ?? company.phone ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Intl.DateTimeFormat("pt-BR").format(
                            company.createdAt
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
