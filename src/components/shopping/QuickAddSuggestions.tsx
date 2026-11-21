import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { cn } from '@/utils/cn'
import { formatItemQuantity, type QuickAddSuggestion } from '@/utils/quickAdd'

// One suggestion row. Touch targets must be at least 40px high
const ROW_HEIGHT = 44

// The list is never shorter than two and a half rows. The half row shows that there is more to scroll to
const MIN_HEIGHT = ROW_HEIGHT * 2.5

// Space kept between the list and the bottom of the visible page
const BOTTOM_GAP = 8

/**
 * The height from the top of an element to the bottom of the visible part of
 * the page. On phones the on-screen keyboard covers the lower part of the
 * page. The visual viewport is the part that is left above it.
 */
function useSpaceBelow(ref: RefObject<HTMLElement>): number | undefined {
  const [space, setSpace] = useState<number>()

  useLayoutEffect(() => {
    const viewport = window.visualViewport
    const measure = () => {
      const element = ref.current
      if (!element) return
      const visibleHeight = viewport?.height ?? window.innerHeight
      const top = element.getBoundingClientRect().top - (viewport?.offsetTop ?? 0)
      setSpace(Math.round(visibleHeight - top - BOTTOM_GAP))
    }

    measure()
    // Capture, so that scrolling inside a sheet is noticed too
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    viewport?.addEventListener('scroll', measure)
    viewport?.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
      viewport?.removeEventListener('scroll', measure)
      viewport?.removeEventListener('resize', measure)
    }
  }, [ref])

  return space
}

interface QuickAddSuggestionsProps {
  /** The id the field points to with aria-controls */
  id: string
  /** The id of the option at an index. The field points to it with aria-activedescendant */
  optionId: (index: number) => string
  suggestions: QuickAddSuggestion[]
  /** Index of the highlighted suggestion, or -1 for none */
  activeIndex: number
  onHighlight: (index: number) => void
  onPick: (suggestion: QuickAddSuggestion) => void
}

/**
 * The list of suggestions under the add field. It lies over the content below
 * the field, so nothing moves as it opens and closes. Focus stays in the
 * field: the field handles the arrow keys and Enter.
 */
export function QuickAddSuggestions({ id, optionId, suggestions, activeIndex, onHighlight, onPick }: QuickAddSuggestionsProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const space = useSpaceBelow(listRef)
  const maxHeight = space === undefined ? undefined : Math.max(space, MIN_HEIGHT)

  // Inside a sheet that scrolls, the list can open below the visible part of
  // the sheet. Scroll just far enough to show it.
  useEffect(() => {
    listRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [suggestions.length, maxHeight])

  // Keep the highlighted suggestion in view when the list itself scrolls
  useEffect(() => {
    if (activeIndex < 0) return
    listRef.current?.children[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex])

  return (
    <ul
      ref={listRef}
      id={id}
      role="listbox"
      aria-label="Suggestions"
      // Keeps focus in the field, so the list stays open and the keyboard stays up
      onMouseDown={(e) => e.preventDefault()}
      // With the pointer gone, Enter adds the typed text again
      onMouseLeave={() => onHighlight(-1)}
      className="absolute inset-x-0 top-full z-30 mt-1 overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
      style={{ maxHeight }}
    >
      {suggestions.map((suggestion, index) => {
        const quantity = formatItemQuantity(suggestion)
        return (
          <li
            key={suggestion.key}
            id={optionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            aria-disabled={suggestion.onList || undefined}
            onClick={() => onPick(suggestion)}
            // Only real pointer movement highlights, so a list that opens under a resting pointer does not change what Enter adds
            onMouseMove={() => {
              const target = suggestion.onList ? -1 : index
              if (target !== activeIndex) onHighlight(target)
            }}
            className={cn(
              'flex items-center gap-3 px-3 text-base md:text-sm',
              suggestion.onList ? 'cursor-default text-gray-500' : 'cursor-pointer text-gray-900',
              index === activeIndex && 'bg-primary-soft'
            )}
            style={{ minHeight: ROW_HEIGHT }}
          >
            <span className="min-w-0 flex-1 truncate">{suggestion.name}</span>
            {suggestion.onList ? (
              <span className="flex-shrink-0 text-xs text-gray-500">On your list</span>
            ) : (
              quantity && <span className="flex-shrink-0 tabular-nums text-gray-500">{quantity}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
