import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-bg-1 px-6 py-12 text-center">
      {icon && <div className="text-text-3">{icon}</div>}
      <h3 className="text-sm font-medium text-text-1">{title}</h3>
      {description && <p className="max-w-sm text-xs text-text-3">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
