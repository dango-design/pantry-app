import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SnackbarProps {
  message: string
  open: boolean
  onClose: () => void
  onUndo?: () => void
  duration?: number
  className?: string
}

export function Snackbar({
  message,
  open,
  onClose,
  onUndo,
  duration = 4000,
  className,
}: SnackbarProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (open) {
      // Small delay for animation
      requestAnimationFrame(() => setIsVisible(true))

      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 200) // Wait for exit animation
      }, duration)

      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [open, duration, onClose])

  if (!open) return null

  return (
    <div
      className={cn(
        'fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto',
        'transition-all duration-200',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
    >
      <div className="bg-gray-800 text-white rounded-lg shadow-lg px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-sm flex-1">{message}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onUndo && (
            <button
              onClick={() => {
                onUndo()
                setIsVisible(false)
                setTimeout(onClose, 200)
              }}
              className="text-white font-medium text-sm hover:text-gray-300 transition-colors"
            >
              Undo
            </button>
          )}
          <button
            onClick={() => {
              setIsVisible(false)
              setTimeout(onClose, 200)
            }}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
