import { Contact2 } from "lucide-react"

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

import { ContactFormDialog } from "./contact-form-dialog"

export default async function ContatosPage() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  const [contacts, companies] = organizationId
    ? await Promise.all([
        prisma.contact.findMany({
          where: { organizationId },
          include: { company: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.company.findMany({
          where: { organizationId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], []]

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Contatos</h1>
              <p className="text-sm text-muted-foreground">
                Pessoas cadastradas na sua organizacao, vinculadas ou nao a
                uma empresa.
              </p>
            </div>
            <ContactFormDialog companies={companies} />
          </div>

          <Card className="border-white/5 bg-card">
            <CardContent className="p-0">
              {contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4A64F]/10">
                    <Contact2 className="h-7 w-7 text-[#D4A64F]" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    Nenhum contato cadastrado
                  </h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Cadastre o primeiro contato para comecar a acompanhar
                    pessoas e oportunidades.
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
                        Empresa
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Cargo
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Contato
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Criado em
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id} className="border-white/5">
                        <TableCell className="font-medium text-white">
                          {contact.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.company?.name ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.role ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.email ?? contact.phone ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Intl.DateTimeFormat("pt-BR").format(
                            contact.createdAt
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
