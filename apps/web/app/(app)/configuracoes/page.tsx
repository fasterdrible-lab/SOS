import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { decryptSecret, maskSecret } from "@/lib/security/crypto"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { API_PROVIDERS } from "@/lib/validations/api-integration"

import { IntegrationCard } from "./integration-card"

const PROVIDER_INFO: Record<
  (typeof API_PROVIDERS)[number],
  { label: string; description: string }
> = {
  ANTHROPIC: {
    label: "Anthropic (Claude)",
    description:
      "Usada pelos modulos de IA do SalesOS (IA SDR, Consultor Digital) quando estiverem disponiveis.",
  },
  OPENAI: {
    label: "OpenAI",
    description: "Provedor alternativo de IA para os mesmos modulos.",
  },
}

export default async function ConfiguracoesPage() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  const integrations = organizationId
    ? await prisma.apiIntegration.findMany({ where: { organizationId } })
    : []

  const integrationsByProvider = new Map(
    integrations.map((integration) => [integration.provider, integration])
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-white/5 bg-background/80 px-6 backdrop-blur">
        <SidebarTrigger className="text-muted-foreground hover:text-white" />
        <Separator orientation="vertical" className="h-4 opacity-20" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            Configuracoes
          </span>
          <Badge
            variant="outline"
            className="border-[#D4A64F]/30 bg-[#D4A64F]/5 text-[10px] text-[#D4A64F]"
          >
            Organizacao
          </Badge>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Integracoes de IA
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure as chaves de API usadas pelos modulos de inteligencia
              artificial do SalesOS. As chaves ficam armazenadas de forma
              criptografada e nunca sao exibidas por completo.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {API_PROVIDERS.map((provider) => {
              const integration = integrationsByProvider.get(provider)
              const maskedKey = integration
                ? maskSecret(decryptSecret(integration.apiKeyEncrypted))
                : null

              return (
                <IntegrationCard
                  key={provider}
                  provider={provider}
                  label={PROVIDER_INFO[provider].label}
                  description={PROVIDER_INFO[provider].description}
                  maskedKey={maskedKey}
                  updatedAt={integration?.updatedAt.toISOString() ?? null}
                />
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
