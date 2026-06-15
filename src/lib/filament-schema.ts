import { z } from 'zod'

export const FILAMENT_MATERIALS = [
  'PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'NYLON', 'PC', 'OTHER',
] as const

export const filamentFormSchema = z.object({
  brand: z.string().trim().min(1, 'Marca obbligatoria').max(255),
  material: z.enum(FILAMENT_MATERIALS, { errorMap: () => ({ message: 'Materiale non valido' }) }),
  color: z.string().trim().nullish(),
  diameter: z.coerce.number().positive('Deve essere > 0').max(10, 'Max 10mm'),
  density: z.coerce.number().positive('Deve essere > 0').nullish(),
  price_per_kg: z.coerce.number().min(0, 'Non negativo'),
  stock_grams: z.coerce.number().min(0, 'Non negativo'),
  low_stock_threshold: z.coerce.number().min(0, 'Non negativo'),
})

export type FilamentFormValues = z.infer<typeof filamentFormSchema>

export const emptyFilamentForm: FilamentFormValues = {
  brand: '',
  material: 'PLA',
  color: '',
  diameter: 1.75,
  density: 1.24,
  price_per_kg: 0,
  stock_grams: 0,
  low_stock_threshold: 500,
}

export function toNewFilament(v: FilamentFormValues) {
  return {
    brand: v.brand,
    material: v.material,
    color: v.color || null,
    diameter: v.diameter,
    density: v.density || null,
    price_per_kg: v.price_per_kg,
    stock_grams: v.stock_grams,
    low_stock_threshold: v.low_stock_threshold,
  }
}

export type NewFilament = ReturnType<typeof toNewFilament>
