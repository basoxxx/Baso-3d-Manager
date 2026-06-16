/**
 * Dropdown panel that lists notifications, with mark-read and
 * mark-all-read actions. Renders an icon per kind and a small
 * status pill. Empties the "unread" state instantly on mark-read
 * via the React Query cache invalidation in the hooks.
 */
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  BellOff,
  Check,
  CheckCircle2,
  Hammer,
  PackageCheck,
  PackageX,
  Trash2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'
import type { LucideIcon } from 'lucide-react'
import type { Notification } from '@/lib/db-types.generated'
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications'

const KIND_META: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  overdue_order: { label: 'Ordine in ritardo', icon: Hammer, tone: 'text-warning' },
  low_stock: { label: 'Magazzino', icon: PackageX, tone: 'text-warning' },
  app_update_available: { label: 'Aggiornamento', icon: CheckCircle2, tone: 'text-accent' },
  backup_ok: { label: 'Backup', icon: PackageCheck, tone: 'text-success' },
  error: { label: 'Errore', icon: AlertCircle, tone: 'text-danger' },
}

function itDate(s: string): string {
  // Server stores ISO8601 in UTC ("2025-06-12T10:00:00Z").
  try {
    return format(new Date(s), 'dd MMM yyyy HH:mm', { locale: itLocale })
  } catch {
    return s
  }
}

interface NotificationPanelProps {
  onClose: () => void
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { data: notifications = [] } = useNotifications({ limit: 50 })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const del = useDeleteNotification()
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Close on outside click.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!panelRef.current) return
      if (!panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: -4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
        className="absolute right-0 top-12 z-50 flex w-[28rem] max-w-[90vw] flex-col overflow-hidden rounded-lg border border-border bg-bg-1 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border bg-bg-2 px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-1">
            <BellOff size={12} className="text-text-3" />
            Centro notifiche
          </div>
          <button
            type="button"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-text-3 hover:bg-bg-3 hover:text-text-1 disabled:opacity-50"
          >
            <Check size={10} />
            Segna tutti come letti
          </button>
        </div>

        <ul className="max-h-96 overflow-y-auto">
          {notifications.length === 0 && (
            <li className="p-6 text-center text-xs text-text-3">
              Nessuna notifica.
            </li>
          )}
          {notifications.map((n) => {
            const meta = KIND_META[n.kind] ?? {
              label: n.kind,
              icon: AlertCircle,
              tone: 'text-text-3',
            }
            const Icon = meta.icon
            return (
              <li
                key={n.id}
                className={`group border-b border-border px-3 py-2 last:border-b-0 ${
                  n.read ? 'bg-bg-1' : 'bg-bg-2/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 ${meta.tone}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-text-3">
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-text-3">{itDate(n.created_at)}</span>
                    </div>
                    <div
                      className={`text-sm ${n.read ? 'text-text-2' : 'text-text-1 font-medium'}`}
                    >
                      {n.title}
                    </div>
                    {n.body && (
                      <div className="text-[11px] text-text-3">{n.body}</div>
                    )}
                    {renderKindLink(n)}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => markRead.mutate(n.id)}
                          className="rounded px-1.5 py-0.5 text-[10px] text-accent hover:bg-accent/10"
                        >
                          Segna letto
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => del.mutate(n.id)}
                        className="rounded px-1.5 py-0.5 text-[10px] text-text-3 opacity-0 hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                        aria-label="Elimina notifica"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </motion.div>
    </AnimatePresence>
  )
}

function renderKindLink(n: Notification) {
  if (!n.data || typeof n.data !== 'object') return null
  const data = n.data as Record<string, unknown>
  const orderId = typeof data.order_id === 'string' ? data.order_id : null
  const filamentId = typeof data.filament_id === 'string' ? data.filament_id : null
  if (orderId) {
    return (
      <Link to={`/orders/${orderId}`} className="text-[11px] text-accent hover:underline">
        Apri ordine →
      </Link>
    )
  }
  if (filamentId) {
    return (
      <Link to={`/filaments/${filamentId}`} className="text-[11px] text-accent hover:underline">
        Apri filamento →
      </Link>
    )
  }
  return null
}
