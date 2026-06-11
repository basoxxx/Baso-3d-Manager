import { z } from 'zod'

export const ORDER_STATUSES = [
  'draft', 'in_produzione', 'completato', 'consegnato', 'annullato',
] as const

export const quoteItemFormSchema = z.object({
  description: z.string().trim().min(1, 'Descrizione obbligatoria'),
  quantity: z.coerce.number().int().min(1, 'Almeno 1'),
  time_hours: z.coerce.number().min(0, 'Non negativo'),
  material_grams: z.coerce.number().min(0, 'Non negativo'),
  filament_id: z.string().nullish(),
  post_processing_cost: z.coerce.number().min(0, 'Non negativo'),
})

export const orderFormSchema = z.object({
  customer_id: z.string().min(1, 'Seleziona un cliente'),
  status: z.enum(ORDER_STATUSES),
  notes: z.string().trim().nullish(),
  margin_percent: z.coerce.number().min(0, 'Non negativo'),
  quote_items: z.array(quoteItemFormSchema).min(1, 'Almeno un articolo'),
})

export type QuoteItemFormValues = z.infer<typeof quoteItemFormSchema>
export type OrderFormValues = z.infer<typeof orderFormSchema>

export const emptyQuoteItem: QuoteItemFormValues = {
  description: '',
  quantity: 1,
  time_hours: 0,
  material_grams: 0,
  filament_id: null,
  post_processing_cost: 0,
}

export function toNewOrder(v: OrderFormValues) {
  return {
    customer_id: v.customer_id,
    status: v.status,
    notes: v.notes || null,
    margin_percent: v.margin_percent,
    quote_items: v.quote_items.map((qi, idx) => ({
      description: qi.description,
      quantity: qi.quantity,
      time_hours: qi.time_hours,
      material_grams: qi.material_grams,
      filament_id: qi.filament_id || null,
      post_processing_cost: qi.post_processing_cost,
      sort_order: idx,
    })),
  }
}
