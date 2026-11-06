import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { AccessDenied } from "@/components/access-denied"
import { prisma } from "@/lib/db"
import { decryptSecret, maskSecret } from "@/lib/security/crypto"
import { API_PROVIDERS } from "@/lib/validations/api-integration"

import { IntegrationCard } from "./integration-card"
import { SaleiaCard } from "./saleia-card"

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

  if (organizationId && !hasPermission(session?.user?.role, "integrations:manage")) {
    return <AccessDenied />
  }

  const [integrations, saleia] = organizationId
    ? await Promise.all([
        prisma.apiIntegration.findMany({ where: { organizationId } }),
        prisma.saleiaIntegration.findUnique({
          where: { organizationId },
          select: { secretHint: true, lastEventAt: true },
        }),
      ])
    : [[], null]

  const integrationsByProvider = new Map(
    integrations.map((integration) => [integration.provider, integration])
  )

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
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

          {organizationId && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Integrações de sistemas</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <SaleiaCard
                  connected={Boolean(saleia)}
                  secretHint={saleia?.secretHint ?? null}
                  lastEventAt={saleia?.lastEventAt?.toISOString() ?? null}
                  endpoint={`/api/integrations/saleia/${organizationId}/events`}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
