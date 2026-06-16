/**
 * Push one notification per (kind, entity) when the dashboard
 * reports something that needs attention. Uses localStorage to
 * avoid pushing the same alert twice.
 */
import { useEffect, useRef } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { useFilaments } from '@/hooks/useFilaments'
import { usePushNotification } from '@/hooks/useNotifications'

const LS_KEY = 'baso.alerts.lastPushedAt'

type AlertSnapshot = {
  ts: number
  lowStockFilamentIds: string[]
  overdueOrderIds: string[]
}

function loadSnapshot(): AlertSnapshot {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return { ts: 0, lowStockFilamentIds: [], overdueOrderIds: [] }
}

function saveSnapshot(s: AlertSnapshot) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

/**
 * Pushes a notification when the user-facing "needs attention"
 * count increases. To avoid spamming, it only fires on transitions
 * (a new entity enters the list) and only once per session per
 * entity.
 */
export function useDashboardAlerts() {
  const { data: dashboard } = useDashboard()
  const { data: filaments = [] } = useFilaments()
  const push = usePushNotification()
  const lastSnapshotRef = useRef<AlertSnapshot>(loadSnapshot())

  useEffect(() => {
    if (!dashboard) return

    const lowStockIds = dashboard.low_stock.map((f) => f.id)
    const overdueIds = dashboard.overdue.map((o) => o.id)

    const prev = lastSnapshotRef.current
    const newLowStock = lowStockIds.filter((id) => !prev.lowStockFilamentIds.includes(id))
    const newOverdue = overdueIds.filter((id) => !prev.overdueOrderIds.includes(id))

    for (const id of newLowStock) {
      const f = filaments.find((x) => x.id === id)
      if (!f) continue
      push.mutate({
        kind: 'low_stock',
        title: `Filamento in esaurimento: ${f.brand} ${f.material}`,
        body: `${f.stock_grams.toFixed(0)} g rimasti (soglia ${f.low_stock_threshold.toFixed(0)} g)`,
        data: { filament_id: id },
      })
    }
    for (const id of newOverdue) {
      const o = dashboard.overdue.find((x) => x.id === id)
      if (!o) continue
      push.mutate({
        kind: 'overdue_order',
        title: `Ordine in ritardo di ${o.days_old}gg`,
        body: `Cliente: ${o.customer_name}`,
        data: { order_id: id },
      })
    }

    if (newLowStock.length > 0 || newOverdue.length > 0) {
      const next: AlertSnapshot = {
        ts: Date.now(),
        lowStockFilamentIds: Array.from(new Set([...prev.lowStockFilamentIds, ...lowStockIds])),
        overdueOrderIds: Array.from(new Set([...prev.overdueOrderIds, ...overdueIds])),
      }
      lastSnapshotRef.current = next
      saveSnapshot(next)
    }
  }, [dashboard, filaments, push])
}
