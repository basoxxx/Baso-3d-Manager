/**
 * Vertical timeline of stock changes for a single filament. Each
 * entry shows the icon for the reason, the delta in grams (with
 * sign), the stock-after value, the timestamp, and a link to the
 * originating order (if any).
 */
import { Link } from 'react-router-dom'
import {
  CheckCircle,
  Hammer,
  PackagePlus,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react'
import { format } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'
import type { LucideIcon } from 'lucide-react'
import type { StockAuditEntry } from '@/lib/db-types.generated'

const REASON_META: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  manual_adjust: { label: 'Aggiustamento manuale', icon: SlidersHorizontal, tone: 'text-text-2' },
  order_production: { label: 'Ordine in produzione', icon: Hammer, tone: 'text-warning' },
  order_revert: { label: 'Ripristino da annullamento', icon: Undo2, tone: 'text-text-2' },
  restock: { label: 'Rifornimento', icon: PackagePlus, tone: 'text-success' },
  correction: { label: 'Rettifica inventario', icon: CheckCircle, tone: 'text-accent' },
}

function itDate(s: string): string {
  try {
    return format(new Date(s.replace(' ', 'T')), 'dd MMM yyyy HH:mm', { locale: itLocale })
  } catch {
    return s
  }
}

export function StockAuditList({ entries }: { entries: StockAuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-text-3">
        Nessuna variazione di magazzino registrata.
      </div>
    )
  }
  return (
    <ol className="space-y-2">
      {entries.map((e) => {
        const meta = REASON_META[e.reason] ?? {
          label: e.reason,
          icon: SlidersHorizontal,
          tone: 'text-text-3',
        }
        const Icon = meta.icon
        const positive = e.delta_grams > 0
        return (
          <li
            key={e.id}
            className="flex items-start gap-3 rounded-md border border-border bg-bg-1 p-3"
          >
            <div className={`mt-0.5 ${meta.tone}`}>
              <Icon size={14} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-1">{meta.label}</span>
                <span
                  className={`text-sm font-mono font-semibold ${
                    positive ? 'text-success' : 'text-warning'
                  }`}
                >
                  {positive ? '+' : ''}
                  {e.delta_grams.toFixed(0)} g
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-3">
                <span>{itDate(e.created_at)}</span>
                <span>·</span>
                <span>stock: {e.stock_after.toFixed(0)} g</span>
                {e.order_id && (
                  <>
                    <span>·</span>
                    <Link
                      to={`/orders/${e.order_id}`}
                      className="text-accent hover:underline"
                    >
                      vedi ordine
                    </Link>
                  </>
                )}
                {e.user_note && (
                  <>
                    <span>·</span>
                    <span className="italic">{e.user_note}</span>
                  </>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export const stockAuditReasonMeta = REASON_META
