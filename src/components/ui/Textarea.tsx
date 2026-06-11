import { forwardRef, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...rest }, ref) => {
    const tid = id || `ta-${Math.random().toString(36).slice(2, 8)}`
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={tid} className="text-xs text-text-3">{label}</label>}
        <textarea
          ref={ref}
          id={tid}
          className={`min-h-[80px] rounded-md border border-border bg-bg-1 px-3 py-2 text-sm text-text-1 placeholder:text-text-3 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 ${error ? 'border-danger' : ''} ${className}`}
          {...rest}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
