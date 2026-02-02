import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer, ShoppingCart, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { CATEGORIES, STORAGE_LOCATIONS } from '@/utils/constants'
import { formatExpirationText, getFreshnessLevel, FRESHNESS_COLORS } from '@/utils/freshness'
import { QUANTITY_UNITS } from '@/utils/constants'
import { getFoodIcon, getLocationIcon } from '@/components/icons'
import { useFlyToCart } from '@/components/common'
import type { FoodItem } from '@/types'

interface FoodItemCardProps {
  item: FoodItem
  onMarkUsed?: (item: FoodItem) => void
  onAddToCart?: (item: FoodItem) => void
  className?: string
}

// Format quantity - use "x5" format if no unit, otherwise "1.34 lbs"
function formatQuantity(quantity: number, unitKey: string): string {
  const unit = QUANTITY_UNITS[unitKey as keyof typeof QUANTITY_UNITS]
  if (!unit || unitKey === 'count' || unitKey === 'unit') {
    return `×${quantity}`
  }
  return `${quantity} ${unit.shortLabel}`
}

// Get short location label
function getLocationLabel(location: string): string {
  const locationConfig = STORAGE_LOCATIONS[location]
  if (locationConfig) {
    // Return short versions
    switch (location) {
      case 'refrigerator': return 'Fridge'
      case 'freezer': return 'Freezer'
      case 'pantry': return 'Pantry'
      case 'counter': return 'Counter'
      default: return locationConfig.label
    }
  }
  return location
}

// Detect touch device
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  return isTouch
}

// Swipe threshold in pixels
const SWIPE_THRESHOLD = 80
const ACTION_WIDTH = 72

export function FoodItemCard({
  item,
  onMarkUsed,
  onAddToCart,
  className,
}: FoodItemCardProps) {
  const navigate = useNavigate()
  const iconRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const { triggerAnimation } = useFlyToCart()
  const [isHovered, setIsHovered] = useState(false)
  const isTouch = useIsTouchDevice()

  // Touch/swipe state
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchCurrentX, setTouchCurrentX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)

  const category = CATEGORIES[item.category] || CATEGORIES.other
  const freshnessLevel = getFreshnessLevel(item.expirationDate)
  const expirationText = formatExpirationText(item.expirationDate)
  const quantityDisplay = formatQuantity(item.quantity, item.quantityUnit)
  const locationLabel = getLocationLabel(item.storageLocation)

  // Get the appropriate icons
  const FoodIcon = getFoodIcon(item.name)
  const LocationIcon = getLocationIcon(item.storageLocation)

  // Calculate swipe offset
  const swipeOffset = isDragging ? touchCurrentX - touchStartX : 0
  const clampedOffset = Math.max(-ACTION_WIDTH, Math.min(ACTION_WIDTH, swipeOffset))

  // Desktop: navigate to detail page on click
  const handleCardClick = (e: React.MouseEvent) => {
    if (isDragging) return
    e.stopPropagation()
    navigate(`/item/${item.id}`)
  }

  const handleAddToCart = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation()

    // Trigger the fly animation
    if (iconRef.current) {
      triggerAnimation(iconRef.current, <FoodIcon size={32} />)
    }

    // Call the callback after a short delay for the animation to be visible
    setTimeout(() => {
      onAddToCart?.(item)
    }, 100)
  }

  const handleMarkUsed = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation()
    onMarkUsed?.(item)
  }

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setTouchCurrentX(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentX = e.touches[0].clientX
    setTouchCurrentX(currentX)

    const diff = currentX - touchStartX
    if (diff < -20) {
      setSwipeDirection('left')
    } else if (diff > 20) {
      setSwipeDirection('right')
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging) return

    const diff = touchCurrentX - touchStartX

    // If swiped past threshold, trigger action
    if (diff < -SWIPE_THRESHOLD) {
      // Swipe left = delete
      handleMarkUsed()
    } else if (diff > SWIPE_THRESHOLD) {
      // Swipe right = add to cart
      handleAddToCart()
    }

    // Reset state
    setIsDragging(false)
    setSwipeDirection(null)
    setTouchStartX(0)
    setTouchCurrentX(0)
  }

  // Default gray color for all metadata
  const metaColor = '#6B7280' // gray-500

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl', className)}
      onMouseEnter={() => !isTouch && setIsHovered(true)}
      onMouseLeave={() => !isTouch && setIsHovered(false)}
    >
      {/* Left action - Add to Cart (revealed on swipe right) */}
      {isTouch && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 flex items-center justify-center bg-teal-500 transition-opacity',
            swipeDirection === 'right' && isDragging ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: ACTION_WIDTH }}
        >
          <ShoppingCart className="h-6 w-6 text-white" />
        </div>
      )}

      {/* Right action - Delete (revealed on swipe left) */}
      {isTouch && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500 transition-opacity',
            swipeDirection === 'left' && isDragging ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: ACTION_WIDTH }}
        >
          <Trash2 className="h-6 w-6 text-white" />
        </div>
      )}

      {/* Main card content */}
      <div
        ref={cardRef}
        onClick={handleCardClick}
        onTouchStart={isTouch ? handleTouchStart : undefined}
        onTouchMove={isTouch ? handleTouchMove : undefined}
        onTouchEnd={isTouch ? handleTouchEnd : undefined}
        className={cn(
          'relative flex items-center bg-white cursor-pointer',
          'shadow-sm hover:shadow-md transition-shadow'
        )}
        style={{
          borderLeft: `4px solid ${category.color}`,
          transform: isTouch && isDragging ? `translateX(${clampedOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {/* Main content */}
        <div className="flex-1 py-3 pl-4 pr-2 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">{item.name}</h3>
          <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: metaColor }}>
            {/* Quantity - fixed width */}
            <span className="w-10 flex-shrink-0">{quantityDisplay}</span>

            {/* Location - with icon */}
            <span className="flex items-center gap-1 w-20 flex-shrink-0">
              {LocationIcon && <LocationIcon size={16} className="flex-shrink-0" />}
              <span className="truncate">{locationLabel}</span>
            </span>

            {/* Expiration - wider width for "2 months" etc */}
            <span
              className="flex items-center gap-1 w-24 flex-shrink-0"
              style={{ color: freshnessLevel === 'fresh' ? metaColor : FRESHNESS_COLORS[freshnessLevel] }}
            >
              <Timer className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap">{expirationText}</span>
            </span>
          </div>
        </div>

        {/* Food icon on the right */}
        <div ref={iconRef} className="flex-shrink-0 w-16 h-16 flex items-center justify-center mr-2">
          <FoodIcon size={48} />
        </div>
      </div>

      {/* Desktop: Action buttons - slide ON TOP from right on hover */}
      {!isTouch && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex transition-transform duration-200',
            isHovered ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          {/* Add to Cart button - teal/green */}
          <button
            onClick={handleAddToCart}
            className="w-14 flex items-center justify-center bg-teal-500 text-white hover:bg-teal-600 transition-colors"
            title="Add to Grocery List & Remove from Pantry"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
          {/* Mark as Used button - red */}
          <button
            onClick={handleMarkUsed}
            className="w-14 flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors"
            title="Remove from Pantry"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}

// Checkbox variant for shopping list integration
interface FoodItemCheckboxCardProps extends FoodItemCardProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export function FoodItemCheckboxCard({
  item,
  checked = false,
  onCheckedChange,
  className,
}: FoodItemCheckboxCardProps) {
  const category = CATEGORIES[item.category] || CATEGORIES.other
  const freshnessLevel = getFreshnessLevel(item.expirationDate)
  const expirationText = formatExpirationText(item.expirationDate)
  const quantityDisplay = formatQuantity(item.quantity, item.quantityUnit)
  const locationLabel = getLocationLabel(item.storageLocation)
  const FoodIcon = getFoodIcon(item.name)
  const LocationIcon = getLocationIcon(item.storageLocation)

  // Default gray color for all metadata
  const metaColor = checked ? '#9CA3AF' : '#6B7280' // gray-400 when checked, gray-500 otherwise

  return (
    <div
      className={cn(
        'flex items-center bg-white rounded-xl overflow-hidden cursor-pointer',
        'shadow-sm hover:shadow-md transition-all',
        checked && 'opacity-60',
        className
      )}
      style={{ borderLeft: `4px solid ${category.color}` }}
      onClick={() => onCheckedChange?.(!checked)}
    >
      {/* Checkbox */}
      <div className="pl-3">
        <div
          className={cn(
            'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
            checked
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 hover:border-gray-400'
          )}
        >
          {checked && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 py-3 pl-3 pr-2 min-w-0">
        <h3
          className={cn(
            'font-semibold text-base leading-tight truncate transition-colors',
            checked ? 'text-gray-400 line-through' : 'text-gray-900'
          )}
        >
          {item.name}
        </h3>
        <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: metaColor }}>
          {/* Quantity */}
          <span className="w-10 flex-shrink-0">{quantityDisplay}</span>

          {/* Location - with icon */}
          <span className="flex items-center gap-1 w-20 flex-shrink-0">
            {LocationIcon && <LocationIcon size={16} className="flex-shrink-0" />}
            <span className="truncate">{locationLabel}</span>
          </span>

          {/* Expiration */}
          <span
            className="flex items-center gap-1 w-24 flex-shrink-0"
            style={{ color: checked ? metaColor : (freshnessLevel === 'fresh' ? metaColor : FRESHNESS_COLORS[freshnessLevel]) }}
          >
            <Timer className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium whitespace-nowrap">{expirationText}</span>
          </span>
        </div>
      </div>

      {/* Food icon */}
      <div className={cn('flex-shrink-0 w-16 h-16 flex items-center justify-center mr-2', checked && 'opacity-50')}>
        <FoodIcon size={48} />
      </div>
    </div>
  )
}
