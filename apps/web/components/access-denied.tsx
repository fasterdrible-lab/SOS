import { ShieldAlert } from "lucide-react"

export function AccessDenied() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4A64F]/10">
          <ShieldAlert className="h-7 w-7 text-gold-fg" />
        </div>
        <h1 className="mb-2 text-lg font-semibold text-foreground">Acesso restrito</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Seu perfil nao tem permissao para ver esta pagina. Fale com o
          administrador da organizacao.
        </p>
      </main>
    </div>
  )
}
