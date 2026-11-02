import { Building2 } from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
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
    <div className="flex flex-1 flex-col">
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Empresas</h1>
              <p className="text-sm text-muted-foreground">
                Contas cadastradas na sua organizacao.
              </p>
            </div>
            <CompanyFormDialog />
          </div>

          <Card className="border-foreground/5 bg-card">
            <CardContent className="p-0">
              {companies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4A64F]/10">
                    <Building2 className="h-7 w-7 text-gold-fg" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
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
                    <TableRow className="border-foreground/5 hover:bg-transparent">
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
                      <TableRow key={company.id} className="border-foreground/5">
                        <TableCell className="font-medium text-foreground">
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
