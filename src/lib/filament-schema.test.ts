import { describe, it, expect } from 'vitest'
import { filamentFormSchema, toNewFilament, emptyFilamentForm } from './filament-schema'

describe('filamentFormSchema', () => {
  it('accepts valid PLA', () => {
    const r = filamentFormSchema.safeParse({ ...emptyFilamentForm, brand: 'Prusament' })
    expect(r.success).toBe(true)
  })

  it('rejects unknown material', () => {
    const r = filamentFormSchema.safeParse({ ...emptyFilamentForm, material: 'WOOD' })
    expect(r.success).toBe(false)
  })

  it('rejects zero diameter', () => {
    const r = filamentFormSchema.safeParse({ ...emptyFilamentForm, diameter: 0 })
    expect(r.success).toBe(false)
  })

  it('rejects negative stock', () => {
    const r = filamentFormSchema.safeParse({ ...emptyFilamentForm, stock_grams: -10 })
    expect(r.success).toBe(false)
  })
})

describe('toNewFilament', () => {
  it('converts empty color to null', () => {
    const out = toNewFilament({ ...emptyFilamentForm, color: '' })
    expect(out.color).toBeNull()
  })

  it('keeps valid density', () => {
    const out = toNewFilament({ ...emptyFilamentForm, density: 1.24 })
    expect(out.density).toBe(1.24)
  })
})
