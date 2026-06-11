import { describe, it, expect } from 'vitest'
import { settingsFormSchema } from './settings-schema'

describe('settingsFormSchema', () => {
  it('accepts EUR defaults', () => {
    const r = settingsFormSchema.safeParse({
      default_hourly_rate: 2.5,
      default_margin_percent: 40,
      currency: 'eur',
      vat_rate: 22,
    })
    expect(r.success).toBe(true)
  })
  it('rejects 2-letter currency', () => {
    const r = settingsFormSchema.safeParse({
      default_hourly_rate: 1, default_margin_percent: 0, currency: 'EU', vat_rate: 0,
    })
    expect(r.success).toBe(false)
  })
  it('rejects negative rate', () => {
    const r = settingsFormSchema.safeParse({
      default_hourly_rate: -1, default_margin_percent: 0, currency: 'EUR', vat_rate: 0,
    })
    expect(r.success).toBe(false)
  })
})
