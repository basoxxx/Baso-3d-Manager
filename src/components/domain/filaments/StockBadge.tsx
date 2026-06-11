import { Badge } from '@/components/ui/Badge'
import type { Filament } from '@/lib/db-types'

export function StockBadge({ filament }: { filament: Filament }) {
  const ratio = filament.stock_grams / Math.max(1, filament.low_stock_threshold)
  if (filament.stock_grams === 0) return <Badge tone="danger">Esaurito</Badge>
  if (ratio < 1) return <Badge tone="warning">Basso</Badge>
  if (ratio < 2) return <Badge tone="info">OK</Badge>
  return <Badge tone="success">Pieno</Badge>
}
