import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2 } from 'lucide-react'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import AutoDeleteOutlined from '@mui/icons-material/AutoDeleteOutlined'
import { cn } from '@/utils/cn'
import { STORAGE_LOCATIONS, CATEGORY_TONES } from '@/utils/constants'
import { formatExpirationText, getFreshnessLevel, FRESHNESS_COLORS } from '@/utils/freshness'
import { QUANTITY_UNITS } from '@/utils/constants'
import { getFoodIcon, getLocationIcon, FoodThumbnail } from '@/components/icons'
import { useFlyToCart } from '@/components/common'
import type { FoodItem } from '@/types'

// Card color tokens (M3 roles, neutral values: white card, zinc-gray outline)
const M3 = {
  onSurface: '#1D1B20',
  surface: '#FFFFFF',
  outlineVariant: '#E4E4E7',
}

interface FoodItemCardProps {
  item: FoodItem
  onMarkUsed?: (item: FoodItem) => void
  /** Return false when the item wasn't added right away (e.g. the page asks first) */
  onAddToCart?: (item: FoodItem) => boolean | void
  className?: string
}

// Format quantity to match Figma: "1 unit", "1.34 lbs", "1 pkg"
function formatQuantity(quantity: number, unitKey: string): string {
  const unit = QUANTITY_UNITS[unitKey as keyof typeof QUANTITY_UNITS]
  if (!unit || unitKey === 'count' || unitKey === 'unit') {
    return `${quantity} unit`
  }
  return `${quantity} ${unit.shortLabel}`
}

// Get short location label
function getLocationLabel(location: string): string {
  const locationConfig = STORAGE_LOCATIONS[location]
  if (locationConfig) {
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

// Icon size matching Figma's 16.667px
const META_ICON_SIZE = 17

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

  const freshnessLevel = getFreshnessLevel(item.expirationDate)
  const expirationText = formatExpirationText(item.expirationDate)
  const quantityDisplay = formatQuantity(item.quantity, item.quantityUnit)
  const locationLabel = getLocationLabel(item.storageLocation)
  const tone = CATEGORY_TONES[item.category] || CATEGORY_TONES.other

  // Get the appropriate icons
  const FoodIcon = getFoodIcon(item.name, item.category)
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

    // Fly to the cart only when the item went straight onto the list,
    // not when the page asks first or it was already there
    const added = onAddToCart?.(item)
    if (added !== false && iconRef.current) {
      triggerAnimation(iconRef.current, <FoodIcon size={32} strokeWidth={1.75} color={tone.ink} />)
    }
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
            'absolute left-0 top-0 bottom-0 flex items-center justify-center bg-primary transition-opacity',
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
        className="relative flex items-center cursor-pointer rounded-xl overflow-hidden"
        style={{
          backgroundColor: M3.surface,
          border: `1px solid ${M3.outlineVariant}`,
          transform: isTouch && isDragging ? `translateX(${clampedOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {/* Left content section */}
        <div className="flex flex-1 items-center self-stretch gap-4 min-w-0">
          {/* Color strip - 8px wide, full height, straight right edge */}
          <div
            className="w-2 self-stretch shrink-0"
            style={{ backgroundColor: tone.strip }}
          />

          {/* Text content */}
          <div className="flex-1 flex flex-col gap-1 py-4 min-w-0">
            {/* Title - M3 Title Medium */}
            <h3
              className="font-medium text-base leading-6 truncate"
              style={{ color: M3.onSurface, letterSpacing: '0.15px' }}
            >
              {item.name}
            </h3>

            {/* Metadata row - M3 Body Medium */}
            <div
              className="flex items-center gap-2.5 text-sm leading-5"
              style={{ color: M3.onSurface, letterSpacing: '0.25px' }}
            >
              {/* Quantity */}
              <span className="flex-1 flex items-center gap-1 min-w-0">
                <Inventory2Outlined className="shrink-0" style={{ fontSize: META_ICON_SIZE }} />
                <span className="truncate">{quantityDisplay}</span>
              </span>

              {/* Location */}
              <span className="flex-1 flex items-center gap-1 min-w-0">
                {LocationIcon && <LocationIcon size={META_ICON_SIZE} className="shrink-0" />}
                <span className="truncate">{locationLabel}</span>
              </span>

              {/* Expiration */}
              <span
                className="flex-1 flex items-center gap-1 min-w-0"
                style={{ color: freshnessLevel === 'fresh' ? M3.onSurface : FRESHNESS_COLORS[freshnessLevel] }}
              >
                <AutoDeleteOutlined className="shrink-0" style={{ fontSize: META_ICON_SIZE }} />
                <span className="truncate">{expirationText}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Media section - 80px, bordered: item photo, or food icon on the category tint */}
        <FoodThumbnail
          ref={iconRef}
          name={item.name}
          category={item.category}
          imageUrl={item.imageUrl}
          iconSize={32}
          className="w-20 self-stretch shrink-0"
          style={{ borderLeft: `1px solid ${M3.outlineVariant}` }}
        />
      </div>

      {/* Desktop: Action buttons - slide ON TOP from right on hover */}
      {!isTouch && (
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex transition-transform duration-200',
            isHovered ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <button
            onClick={handleAddToCart}
            className="w-14 flex items-center justify-center bg-primary text-white hover:bg-primary-hover transition-colors"
            title="Add to shopping list"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
          <button
            onClick={handleMarkUsed}
            className="w-14 flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors"
            title="Remove from pantry"
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
  const freshnessLevel = getFreshnessLevel(item.expirationDate)
  const expirationText = formatExpirationText(item.expirationDate)
  const quantityDisplay = formatQuantity(item.quantity, item.quantityUnit)
  const locationLabel = getLocationLabel(item.storageLocation)
  const LocationIcon = getLocationIcon(item.storageLocation)
  const tone = CATEGORY_TONES[item.category] || CATEGORY_TONES.other

  const textColor = checked ? '#9CA3AF' : M3.onSurface

  return (
    <div
      className={cn(
        'flex items-center rounded-xl overflow-hidden cursor-pointer',
        checked && 'opacity-60',
        className
      )}
      style={{
        backgroundColor: M3.surface,
        border: `1px solid ${M3.outlineVariant}`,
      }}
      onClick={() => onCheckedChange?.(!checked)}
    >
      {/* Color strip */}
      <div
        className="w-2 self-stretch shrink-0"
        style={{ backgroundColor: tone.strip }}
      />

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
            'font-medium text-base leading-6 truncate transition-colors',
            checked && 'line-through'
          )}
          style={{ color: textColor, letterSpacing: '0.15px' }}
        >
          {item.name}
        </h3>
        <div
          className="flex items-center gap-2.5 mt-1 text-sm leading-5"
          style={{ color: textColor, letterSpacing: '0.25px' }}
        >
          {/* Quantity */}
          <span className="flex-1 flex items-center gap-1 min-w-0">
            <Inventory2Outlined className="shrink-0" style={{ fontSize: META_ICON_SIZE }} />
            <span className="truncate">{quantityDisplay}</span>
          </span>

          {/* Location */}
          <span className="flex-1 flex items-center gap-1 min-w-0">
            {LocationIcon && <LocationIcon size={META_ICON_SIZE} className="shrink-0" />}
            <span className="truncate">{locationLabel}</span>
          </span>

          {/* Expiration */}
          <span
            className="flex-1 flex items-center gap-1 min-w-0"
            style={{ color: checked ? textColor : (freshnessLevel === 'fresh' ? textColor : FRESHNESS_COLORS[freshnessLevel]) }}
          >
            <AutoDeleteOutlined className="shrink-0" style={{ fontSize: META_ICON_SIZE }} />
            <span className="truncate">{expirationText}</span>
          </span>
        </div>
      </div>

      {/* Item photo, or food icon on the category tint */}
      <FoodThumbnail
        name={item.name}
        category={item.category}
        imageUrl={item.imageUrl}
        iconSize={32}
        className={cn('w-20 self-stretch shrink-0', checked && 'opacity-50')}
        style={{ borderLeft: `1px solid ${M3.outlineVariant}` }}
      />
    </div>
  )
}
