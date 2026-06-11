import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-bg-0 px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-text-1">{title}</h1>
        {description && <p className="mt-0.5 text-xs text-text-3">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
