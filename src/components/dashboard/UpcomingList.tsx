import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import type { UpcomingOrder } from '@/lib/dashboard-types'
import { StatusBadge } from '@/components/domain/orders/StatusBadge'

interface UpcomingListProps {
  orders: UpcomingOrder[]
}

export function UpcomingList({ orders }: UpcomingListProps) {
  if (orders.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-text-3">
        Nessun ordine aperto
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {orders.map((o, i) => (
        <motion.div
          key={o.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            to={`/orders/${o.id}`}
            className="block rounded-md border border-border bg-bg-1 p-3 transition-colors hover:border-accent"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-text-1">{o.customer_name}</div>
                <div className="text-xs text-text-3">
                  {format(parseISO(o.created_at), 'dd MMM yyyy', { locale: it })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-success">€{o.total.toFixed(2)}</div>
                <div className="mt-1">
                  <StatusBadge status={o.status as any} />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
