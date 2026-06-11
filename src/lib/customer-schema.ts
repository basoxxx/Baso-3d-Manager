import { z } from 'zod'

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome obbligatorio').max(255),
  email: z.string().trim().min(1, 'Email obbligatoria').email('Email non valida'),
  phone: z.string().trim().nullish(),
  address: z.string().trim().nullish(),
  vat_number: z.string().trim().nullish(),
  notes: z.string().trim().nullish(),
})

export type CustomerFormValues = z.infer<typeof customerFormSchema>

export const emptyCustomerForm: CustomerFormValues = {
  name: '',
  email: '',
  phone: '',
  address: '',
  vat_number: '',
  notes: '',
}

export function toNewCustomer(values: CustomerFormValues) {
  return {
    name: values.name,
    email: values.email,
    phone: values.phone || null,
    address: values.address || null,
    vat_number: values.vat_number || null,
    notes: values.notes || null,
  }
}

export type NewCustomer = ReturnType<typeof toNewCustomer>
