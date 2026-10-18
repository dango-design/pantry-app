import { forwardRef, type CSSProperties } from 'react'
import { cn } from '@/utils/cn'
import { CATEGORY_TONES } from '@/utils/constants'
import { getFoodIcon } from './FoodIcons'
import type { FoodCategory } from '@/types'

interface FoodThumbnailProps {
  name: string
  category: FoodCategory
  imageUrl?: string
  iconSize?: number
  className?: string
  style?: CSSProperties
}

// The item's photo when it has one, otherwise a line icon on the category's tint.
// Size and corner radius come from className.
export const FoodThumbnail = forwardRef<HTMLDivElement, FoodThumbnailProps>(function FoodThumbnail(
  { name, category, imageUrl, iconSize = 28, className, style },
  ref
) {
  const tone = CATEGORY_TONES[category] || CATEGORY_TONES.other
  const Icon = getFoodIcon(name, category)

  return (
    <div
      ref={ref}
      className={cn('flex items-center justify-center overflow-hidden', className)}
      style={{ backgroundColor: tone.tint, color: tone.ink, ...style }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <Icon size={iconSize} strokeWidth={1.75} aria-hidden="true" />
      )}
    </div>
  )
})
