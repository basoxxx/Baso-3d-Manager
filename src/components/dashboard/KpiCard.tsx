import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'default' | 'success' | 'warning'
}

const TONE_CLASSES: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
}

export function KpiCard({ label, value, icon: Icon, tone = 'default' }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg border border-border bg-gradient-to-br from-bg-1 to-bg-2 p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-text-3">{label}</span>
        <Icon size={14} className={TONE_CLASSES[tone]} />
      </div>
      <div className={`mt-2 text-2xl font-bold ${TONE_CLASSES[tone]}`}>{value}</div>
    </motion.div>
  )
}
