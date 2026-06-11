import { useEffect, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({ open, onOpenChange, title, description, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-50 w-full ${sizes[size]} -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-bg-1 p-6 shadow-2xl focus:outline-none`}
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Dialog.Title className="text-base font-semibold text-text-1">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-1 text-sm text-text-3">{description}</Dialog.Description>}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1 text-text-3 hover:bg-bg-2 hover:text-text-1"
              aria-label="Chiudi"
            >
              <X size={16} />
            </button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
