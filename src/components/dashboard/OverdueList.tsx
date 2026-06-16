/**
 * List of open orders older than the dashboard's `OVERDUE_DAYS` threshold
 * (14 days). Each row shows the customer, age in days, and a link to
 * the order detail.
 */
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OverdueOrder } from '@/lib/db-types.generated'
import { StatusBadge } from '@/components/domain/orders/StatusBadge'

interface OverdueListProps {
  orders: OverdueOrder[]
}

export function OverdueList({ orders }: OverdueListProps) {
  if (orders.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-text-3">
        <span className="flex items-center gap-2">
          <Clock size={14} className="text-success" />
          Nessun ordine in ritardo
        </span>
      </div>
    )
  }

  return (
    <ul className="space-y-1.5">
      <AnimatePresence>
        {orders.map((o, i) => (
          <motion.li
            key={o.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, delay: i * 0.02 }}
          >
            <Link
              to={`/orders/${o.id}`}
              className="flex items-center gap-3 rounded-md border border-border bg-bg-1 px-3 py-2 text-sm hover:border-accent/50"
            >
              <Clock size={14} className="text-warning" />
              <div className="flex-1">
                <div className="font-medium text-text-1">{o.customer_name}</div>
                <div className="flex items-center gap-2 text-xs text-text-3">
                  <StatusBadge status={o.status as any} />
                  <span className="text-warning">+{o.days_old}gg</span>
                </div>
              </div>
            </Link>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
