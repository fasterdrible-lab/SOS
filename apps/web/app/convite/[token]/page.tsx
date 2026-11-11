import Link from "next/link"
import { TrendingUp } from "lucide-react"

import { roleLabel } from "@/lib/members/rules"
import { getInviteByToken } from "@/lib/members/service"

import { AcceptForm } from "./accept-form"

export const metadata = { title: "Convite - SalesOS", robots: { index: false } }

const STATE_MESSAGES = {
  ACCEPTED: "Este convite já foi usado. Entre com seu e-mail e senha.",
  REVOKED: "Este convite foi cancelado. Peça um novo ao administrador.",
  EXPIRED: "Este convite expirou. Peça um novo ao administrador.",
} as const

/** Pagina publica do convite (liberada em lib/auth.config.ts). */
export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await getInviteByToken(token)

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4A64F]">
            <TrendingUp className="h-4 w-4 text-[#1E1B3A]" />
          </div>
          <span className="font-semibold text-foreground">SalesOS</span>
        </div>

        {!invite ? (
          <Message title="Convite não encontrado" text="Confira se o link foi copiado inteiro ou peça um novo ao administrador." />
        ) : invite.state !== "PENDING" ? (
          <Message title={`Convite para ${invite.organizationName}`} text={STATE_MESSAGES[invite.state]} />
        ) : (
          <>
            <div>
              <h1 className="mb-1 text-2xl font-semibold text-foreground">Entrar em {invite.organizationName}</h1>
              <p className="text-sm text-muted-foreground">
                Convite para <span className="text-foreground">{invite.email}</span> como{" "}
                <span className="text-foreground">{roleLabel(invite.role).toLowerCase()}</span>.
              </p>
            </div>
            <AcceptForm token={token} email={invite.email} hasAccount={invite.hasAccount} />
          </>
        )}
      </div>
    </main>
  )
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link href="/login" className="text-sm text-gold-fg hover:underline">
        Ir para o login
      </Link>
    </div>
  )
}
