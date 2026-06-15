import { z } from 'zod'

export const settingsFormSchema = z.object({
  default_hourly_rate: z.coerce.number().min(0, 'Non negativo'),
  default_margin_percent: z.coerce.number().min(0, 'Non negativo'),
  currency: z.string().trim().length(3, 'Codice ISO a 3 lettere').toUpperCase(),
  vat_rate: z.coerce.number().min(0, 'Non negativo'),
})

export type SettingsFormValues = z.infer<typeof settingsFormSchema>

export function toUpdateSettings(v: SettingsFormValues) {
  return {
    default_hourly_rate: v.default_hourly_rate,
    default_margin_percent: v.default_margin_percent,
    currency: v.currency,
    vat_rate: v.vat_rate,
  }
}

export type UpdateSettings = ReturnType<typeof toUpdateSettings>
