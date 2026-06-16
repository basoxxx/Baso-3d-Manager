import { motion } from 'framer-motion'
import {
  ClipboardList,
  DollarSign,
  Users,
  Layers,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDashboard } from '@/hooks/useDashboard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { UpcomingList } from '@/components/dashboard/UpcomingList'
import { LowStockList } from '@/components/dashboard/LowStockList'
import { OverdueList } from '@/components/dashboard/OverdueList'

export function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const kpis = data?.kpis

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Ordini aperti"
          value={isLoading ? '…' : String(kpis?.open_orders ?? 0)}
          icon={ClipboardList}
          tone="default"
        />
        <KpiCard
          label="Fatturato 30gg"
          value={isLoading ? '…' : `€${(kpis?.month_revenue ?? 0).toFixed(0)}`}
          icon={DollarSign}
          tone="success"
        />
        <KpiCard
          label="Clienti totali"
          value={isLoading ? '…' : String(kpis?.total_customers ?? 0)}
          icon={Users}
        />
        <KpiCard
          label="kg consumati 30gg"
          value={isLoading ? '…' : (kpis?.kg_consumed_month ?? 0).toFixed(1)}
          icon={Layers}
          tone="warning"
        />
        <KpiCard
          label="Filamenti bassi"
          value={isLoading ? '…' : String(kpis?.low_stock_filaments ?? 0)}
          icon={AlertTriangle}
          tone={(kpis?.low_stock_filaments ?? 0) > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          label="Ordini in ritardo"
          value={isLoading ? '…' : String(kpis?.overdue_orders ?? 0)}
          icon={Clock}
          tone={(kpis?.overdue_orders ?? 0) > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-lg border border-border bg-bg-1 p-4 lg:col-span-2"
        >
          <h2 className="mb-3 text-sm font-semibold text-text-1">Fatturato ultimi 30gg</h2>
          {data?.revenue_30d && data.revenue_30d.length > 0 ? (
            <RevenueChart data={data.revenue_30d} />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-text-3">
              {isLoading ? 'Caricamento…' : 'Nessun dato'}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-lg border border-border bg-bg-1 p-4"
        >
          <h2 className="mb-3 text-sm font-semibold text-text-1">Da evadere</h2>
          <UpcomingList orders={data?.upcoming ?? []} />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-lg border border-border bg-bg-1 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-1">Da riordinare</h2>
            <Link
              to="/filaments"
              className="text-[10px] uppercase tracking-wide text-text-3 hover:text-accent"
            >
              Tutti i filamenti
            </Link>
          </div>
          <LowStockList filaments={data?.low_stock ?? []} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-lg border border-border bg-bg-1 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-1">Ordini in ritardo &gt; 14gg</h2>
            <Link
              to="/orders"
              className="text-[10px] uppercase tracking-wide text-text-3 hover:text-accent"
            >
              Tutti gli ordini
            </Link>
          </div>
          <OverdueList orders={data?.overdue ?? []} />
        </motion.div>
      </div>
    </div>
  )
}
