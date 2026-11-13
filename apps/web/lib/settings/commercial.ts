import { recordAudit } from "@/lib/audit/record"
import { prisma } from "@/lib/db"
import {
  changedSettings,
  DEFAULT_COMMERCIAL_SETTINGS,
  normalizeHolidays,
  type CommercialSettings,
} from "@/lib/settings/rules"

/** Configuracoes da organizacao; sem registro, os padroes. */
export async function getCommercialSettings(organizationId: string): Promise<CommercialSettings> {
  const row = await prisma.commercialSettings.findUnique({
    where: { organizationId },
    select: { coolingAfterDays: true, holidays: true },
  })
  if (!row) return { ...DEFAULT_COMMERCIAL_SETTINGS }
  return { coolingAfterDays: row.coolingAfterDays, holidays: normalizeHolidays(row.holidays) }
}

/** Grava e audita so os nomes dos campos que mudaram; sem mudanca, nao grava. */
export async function updateCommercialSettings(input: {
  organizationId: string
  actorUserId: string
  settings: CommercialSettings
}): Promise<{ settings: CommercialSettings; changed: string[] }> {
  const { organizationId, actorUserId } = input
  const settings = { ...input.settings, holidays: normalizeHolidays(input.settings.holidays) }
  const changed = changedSettings(await getCommercialSettings(organizationId), settings)
  if (changed.length === 0) return { settings, changed }

  await prisma.$transaction(async (tx) => {
    await tx.commercialSettings.upsert({
      where: { organizationId },
      create: { organizationId, ...settings },
      update: settings,
    })
    await recordAudit(
      {
        organizationId,
        actorUserId,
        action: "settings.commercial-updated",
        entityType: "CommercialSettings",
        entityId: organizationId,
        metadata: { fields: changed },
      },
      tx
    )
  })
  return { settings, changed }
}
