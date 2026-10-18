import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

// Slide-up sheet with a drag handle, matching the filter sheets
export function BottomSheet({ open, onClose, title, subtitle, children, footer, className }: BottomSheetProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)

  useEffect(() => {
    if (!open) {
      setIsVisible(false)
      return
    }
    requestAnimationFrame(() => setIsVisible(true))

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const diff = e.touches[0].clientY - dragStartY.current
    if (diff > 0) setDragY(diff)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (dragY > 100) onClose()
    setDragY(0)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-2xl max-h-[85vh] flex flex-col transition-transform duration-300 ease-out',
          className
        )}
        style={{
          transform: isVisible ? `translateY(${isDragging ? dragY : 0}px)` : 'translateY(100%)',
        }}
      >
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="flex items-start justify-between gap-3 px-4 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 -mt-1 text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="p-4 border-t border-gray-100 safe-area-bottom">{footer}</div>
        )}
      </div>
    </div>
  )
}
