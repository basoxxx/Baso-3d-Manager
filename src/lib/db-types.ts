export type FilamentMaterial =
  | 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'ASA' | 'NYLON' | 'PC' | 'OTHER'

export type PrinterStatus = 'active' | 'maintenance' | 'retired'

export type OrderStatus =
  | 'draft' | 'in_produzione' | 'completato' | 'consegnato' | 'annullato'

export interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  vat_number: string | null
  notes: string | null
  created_at: string
  deleted_at: string | null
}

export interface Filament {
  id: string
  brand: string
  material: FilamentMaterial
  color: string | null
  diameter: number
  density: number | null
  price_per_kg: number
  stock_grams: number
  low_stock_threshold: number
  created_at: string
  deleted_at: string | null
}

export interface Printer {
  id: string
  name: string
  model: string | null
  build_volume_x: number | null
  build_volume_y: number | null
  build_volume_z: number | null
  status: PrinterStatus
  notes: string | null
  created_at: string
  deleted_at: string | null
}

export interface Order {
  id: string
  customer_id: string
  status: OrderStatus
  notes: string | null
  margin_percent: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface QuoteItem {
  id: string
  order_id: string
  description: string
  quantity: number
  time_hours: number
  material_grams: number
  filament_id: string | null
  post_processing_cost: number
  sort_order: number
  created_at: string
}

export interface Settings {
  id: 1
  default_hourly_rate: number
  default_margin_percent: number
  currency: string
  vat_rate: number
  updated_at: string
}
