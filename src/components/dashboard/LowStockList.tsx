/**
 * List of filaments whose stock has reached or fallen below their
 * own threshold. Clicking a row navigates to the filament detail.
 */
import { Link } from 'react-router-dom'
import { AlertTriangle, Beaker } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LowStockFilament } from '@/lib/db-types.generated'

interface LowStockListProps {
  filaments: LowStockFilament[]
}

export function LowStockList({ filaments }: LowStockListProps) {
  if (filaments.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-text-3">
        <span className="flex items-center gap-2">
          <Beaker size={14} className="text-success" />
          Tutti i filamenti sono sopra soglia
        </span>
      </div>
    )
  }

  return (
    <ul className="space-y-1.5">
      <AnimatePresence>
        {filaments.map((f, i) => {
          const ratio = f.low_stock_threshold > 0 ? f.stock_grams / f.low_stock_threshold : 0
          const tone =
            ratio === 0
              ? 'text-danger'
              : ratio < 0.5
                ? 'text-danger'
                : 'text-warning'
          return (
            <motion.li
              key={f.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: i * 0.02 }}
            >
              <Link
                to={`/filaments/${f.id}`}
                className="flex items-center gap-3 rounded-md border border-border bg-bg-1 px-3 py-2 text-sm hover:border-accent/50"
              >
                <AlertTriangle size={14} className={tone} />
                <div className="flex-1">
                  <div className="font-medium text-text-1">
                    {f.brand} <span className="text-text-3">·</span> {f.material}
                    {f.color && (
                      <span className="ml-1 text-text-3">({f.color})</span>
                    )}
                  </div>
                  <div className="text-xs text-text-3">
                    {f.stock_grams.toFixed(0)} g / soglia {f.low_stock_threshold.toFixed(0)} g
                  </div>
                </div>
                {f.low_stock_threshold > 0 && (
                  <span className={`text-xs font-medium ${tone}`}>
                    {Math.round(ratio * 100)}%
                  </span>
                )}
              </Link>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
