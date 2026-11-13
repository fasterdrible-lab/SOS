import { z } from "zod"

import { COOLING_DAYS_MAX, COOLING_DAYS_MIN, isCalendarDay, MAX_HOLIDAYS } from "@/lib/settings/rules"

export const commercialSettingsSchema = z.object({
  coolingAfterDays: z
    .number()
    .int("Informe um numero inteiro de dias.")
    .min(COOLING_DAYS_MIN, `Minimo de ${COOLING_DAYS_MIN} dia.`)
    .max(COOLING_DAYS_MAX, `Maximo de ${COOLING_DAYS_MAX} dias.`),
  holidays: z
    .array(z.string().refine(isCalendarDay, "Data invalida (AAAA-MM-DD)."))
    .max(MAX_HOLIDAYS, `No maximo ${MAX_HOLIDAYS} feriados.`),
})

export type CommercialSettingsInput = z.infer<typeof commercialSettingsSchema>
