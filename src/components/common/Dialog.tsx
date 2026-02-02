import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from './Button'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        className={cn(
          'relative z-50 w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl',
          'animate-in fade-in zoom-in-95 duration-200',
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-6 pt-6 pb-4">
            {title && (
              <h2 id="dialog-title" className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
            )}
            {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
          </div>
        )}

        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 p-1 rounded-full"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Content */}
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}

interface DialogActionsProps {
  children: ReactNode
  className?: string
}

export function DialogActions({ children, className }: DialogActionsProps) {
  return <div className={cn('flex gap-3 justify-end mt-6', className)}>{children}</div>
}
