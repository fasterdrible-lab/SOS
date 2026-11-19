import Link from "next/link"

import { BrandMark } from "@/components/brand"
import { getPasswordResetByToken } from "@/lib/members/service"

import { ResetForm } from "./reset-form"

export const metadata = { title: "Nova senha - SaleOS", robots: { index: false } }

const STATE_MESSAGES = {
  USED: "Este link já foi usado. Entre com a senha nova.",
  REVOKED: "Este link foi substituído por outro. Use o mais recente que o administrador enviou.",
  EXPIRED: "Este link expirou. Peça um novo ao administrador.",
} as const

/** Pagina publica de nova senha (liberada em lib/auth.config.ts). */
export default async function RedefinirSenhaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const reset = await getPasswordResetByToken(token)

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-2">
          <BrandMark size={32} />
          <span className="font-semibold text-foreground">SaleOS</span>
        </div>

        {!reset || reset.state !== "PENDING" ? (
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {reset ? "Link indisponível" : "Link não encontrado"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {reset && reset.state !== "PENDING"
                ? STATE_MESSAGES[reset.state]
                : "Confira se o link foi copiado inteiro ou peça um novo ao administrador."}
            </p>
            <Link href="/login" className="text-sm text-gold-fg hover:underline">
              Ir para o login
            </Link>
          </div>
        ) : (
          <>
            <div>
              <h1 className="mb-1 text-2xl font-semibold text-foreground">Criar nova senha</h1>
              <p className="text-sm text-muted-foreground">
                Para a conta <span className="text-foreground">{reset.email}</span>.
              </p>
            </div>
            <ResetForm token={token} email={reset.email} />
          </>
        )}
      </div>
    </main>
  )
}
