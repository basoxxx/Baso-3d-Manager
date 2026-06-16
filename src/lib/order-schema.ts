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
  apply_vat: z.boolean(),
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
    apply_vat: v.apply_vat,
    quote_items: v.quote_items.map((qi) => ({
      description: qi.description,
      quantity: qi.quantity,
      time_hours: qi.time_hours,
      material_grams: qi.material_grams,
      filament_id: qi.filament_id || null,
      post_processing_cost: qi.post_processing_cost,
    })),
  }
}

export type NewOrder = ReturnType<typeof toNewOrder>


/**
 * Build an OrderFormValues pre-populated from an existing order, ready
 * to be passed to a "duplica" flow. Used by:
 *   - the "Duplica" button on OrderFormPage when editing an existing
 *     order: navigates to /orders/new?from=<id> which the page picks
 *     up via useSearchParams
 *   - the "Duplica ordine" action in the command palette
 *
 * Behaviour:
 *   - status is reset to 'draft' (the new copy hasn't started)
 *   - notes, margin_percent, apply_vat, customer_id are copied
 *   - quote_items are copied verbatim (description, quantity,
 *     time_hours, material_grams, filament_id, post_processing_cost);
 *     the order page re-derives sort_order from the array position
 *   - returns the canonical OrderFormValues shape so it can be fed
 *     directly into react-hook-form's `reset(...)`
 */
export function fromOrderForDuplicate(
  source: {
    customer_id: string
    notes: string | null
    margin_percent: number
    apply_vat: boolean
    items: Array<{
      description: string
      quantity: number
      time_hours: number
      material_grams: number
      filament_id: string | null
      post_processing_cost: number
    }>
  }
): OrderFormValues {
  return {
    customer_id: source.customer_id,
    status: 'draft',
    notes: source.notes ?? '',
    margin_percent: source.margin_percent,
    apply_vat: source.apply_vat,
    quote_items:
      source.items.length > 0
        ? source.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            time_hours: i.time_hours,
            material_grams: i.material_grams,
            filament_id: i.filament_id,
            post_processing_cost: i.post_processing_cost,
          }))
        : [emptyQuoteItem],
  }
}
