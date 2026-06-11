import { describe, it, expect } from 'vitest'
import { customerFormSchema, toNewCustomer, emptyCustomerForm } from './customer-schema'

describe('customerFormSchema', () => {
  it('accepts a valid customer', () => {
    const r = customerFormSchema.safeParse({
      name: 'Mario',
      email: 'm@x.it',
      phone: '333',
      address: '',
      vat_number: '',
      notes: '',
    })
    expect(r.success).toBe(true)
  })

  it('rejects empty name', () => {
    const r = customerFormSchema.safeParse({ ...emptyCustomerForm, name: '   ' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const r = customerFormSchema.safeParse({ ...emptyCustomerForm, email: 'no-at' })
    expect(r.success).toBe(false)
  })

  it('trims whitespace', () => {
    const r = customerFormSchema.safeParse({
      name: '  Mario  ',
      email: 'm@x.it',
      phone: '', address: '', vat_number: '', notes: '',
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.name).toBe('Mario')
  })
})

describe('toNewCustomer', () => {
  it('converts empty strings to null', () => {
    const out = toNewCustomer({ ...emptyCustomerForm, name: 'X', email: 'a@b.it' })
    expect(out.phone).toBeNull()
    expect(out.address).toBeNull()
  })

  it('keeps non-empty values', () => {
    // Simulate real usage: form data goes through schema (trims), then toNewCustomer.
    const parsed = customerFormSchema.parse({
      ...emptyCustomerForm,
      name: 'X', email: 'a@b.it',
      phone: '  333  ',
    })
    const out = toNewCustomer(parsed)
    expect(out.phone).toBe('333')
  })
})
