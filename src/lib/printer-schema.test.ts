import { describe, it, expect } from 'vitest'
import { printerFormSchema, toNewPrinter, emptyPrinterForm } from './printer-schema'

describe('printerFormSchema', () => {
  it('accepts minimal printer', () => {
    const r = printerFormSchema.safeParse({ ...emptyPrinterForm, name: 'Prusa' })
    expect(r.success).toBe(true)
  })
  it('rejects empty name', () => {
    const r = printerFormSchema.safeParse(emptyPrinterForm)
    expect(r.success).toBe(false)
  })
  it('rejects bad status', () => {
    const r = printerFormSchema.safeParse({ ...emptyPrinterForm, name: 'X', status: 'broken' })
    expect(r.success).toBe(false)
  })
})

describe('toNewPrinter', () => {
  it('converts empty strings to null', () => {
    const out = toNewPrinter({ ...emptyPrinterForm, name: 'X' })
    expect(out.model).toBeNull()
  })
})
