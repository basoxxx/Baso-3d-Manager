import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-bg-1 p-5 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
