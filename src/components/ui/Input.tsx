import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...rest }, ref) => {
    const inputId = id || `inp-${Math.random().toString(36).slice(2, 8)}`
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={inputId} className="text-xs text-text-3">{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={`h-9 rounded-md border border-border bg-bg-1 px-3 text-sm text-text-1 placeholder:text-text-3 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 ${error ? 'border-danger' : ''} ${className}`}
          {...rest}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
        {!error && hint && <span className="text-xs text-text-3">{hint}</span>}
      </div>
    )
  },
)
Input.displayName = 'Input'
