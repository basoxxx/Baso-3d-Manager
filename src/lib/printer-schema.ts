import { z } from 'zod'

export const PRINTER_STATUSES = ['active', 'maintenance', 'retired'] as const

export const printerFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome obbligatorio').max(255),
  model: z.string().trim().nullish(),
  build_volume_x: z.coerce.number().int().positive().nullish(),
  build_volume_y: z.coerce.number().int().positive().nullish(),
  build_volume_z: z.coerce.number().int().positive().nullish(),
  status: z.enum(PRINTER_STATUSES),
  notes: z.string().trim().nullish(),
})

export type PrinterFormValues = z.infer<typeof printerFormSchema>

export const emptyPrinterForm: PrinterFormValues = {
  name: '',
  model: '',
  build_volume_x: undefined,
  build_volume_y: undefined,
  build_volume_z: undefined,
  status: 'active',
  notes: '',
}

export function toNewPrinter(v: PrinterFormValues) {
  return {
    name: v.name,
    model: v.model || null,
    build_volume_x: v.build_volume_x ?? null,
    build_volume_y: v.build_volume_y ?? null,
    build_volume_z: v.build_volume_z ?? null,
    status: v.status,
    notes: v.notes || null,
  }
}

export type NewPrinter = ReturnType<typeof toNewPrinter>
