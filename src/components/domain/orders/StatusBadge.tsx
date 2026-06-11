import { Badge } from '@/components/ui/Badge'
import type { OrderStatus } from '@/lib/db-types'

const TONE: Record<OrderStatus, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  draft: 'neutral',
  in_produzione: 'info',
  completato: 'success',
  consegnato: 'success',
  annullato: 'danger',
}

const LABEL: Record<OrderStatus, string> = {
  draft: 'Bozza',
  in_produzione: 'In produzione',
  completato: 'Completato',
  consegnato: 'Consegnato',
  annullato: 'Annullato',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>
}
