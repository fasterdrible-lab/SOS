import { AccessDenied } from "@/components/access-denied"
import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/authz/permissions"
import { getCommercialSettings } from "@/lib/settings/commercial"
import { COOLING_DAYS_MAX, COOLING_DAYS_MIN, MAX_HOLIDAYS } from "@/lib/settings/rules"

import { SettingsNav } from "../settings-nav"
import { CommercialForm } from "./commercial-form"

export default async function ComercialPage() {
  const session = await auth()
  const organizationId = session?.user?.organizationId

  if (!organizationId) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Acesse um cliente para ver as configurações comerciais.
      </main>
    )
  }
  if (!hasPermission(session.user.role, "commercial-settings:manage")) return <AccessDenied />

  const settings = await getCommercialSettings(organizationId)

  return (
    <main className="min-w-0 flex-1 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <SettingsNav active="comercial" />
        <div>
          <h1 className="text-lg font-semibold text-foreground">Configurações comerciais</h1>
          <p className="text-sm text-muted-foreground">
            Valem para todas as pessoas deste cliente, no Meu Dia, no Dashboard e nas notificações.
          </p>
        </div>
        <CommercialForm
          settings={settings}
          limits={{ coolingMin: COOLING_DAYS_MIN, coolingMax: COOLING_DAYS_MAX, maxHolidays: MAX_HOLIDAYS }}
        />
      </div>
    </main>
  )
}
