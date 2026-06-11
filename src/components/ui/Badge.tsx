import type { HTMLAttributes } from 'react'

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

const tones: Record<Tone, string> = {
  neutral: 'bg-bg-3 text-text-2',
  info: 'bg-blue-950 text-blue-300',
  success: 'bg-emerald-950 text-emerald-300',
  warning: 'bg-amber-950 text-amber-300',
  danger: 'bg-red-950 text-red-300',
}

export function Badge({ tone = 'neutral', className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  )
}
