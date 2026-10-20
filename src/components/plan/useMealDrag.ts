import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type PointerEvent, type TouchEvent as ReactTouchEvent } from 'react'
import type { MealSlot } from '@/types'

export interface DropTarget {
  date: string
  slot: MealSlot
}

export interface MealDragState {
  entryId: string
  label: string
  x: number
  y: number
  target: DropTarget | null
}

// A touch press on a card in progress: lifted once held still for LONG_PRESS_MS
interface TouchHold {
  entryId: string
  label: string
  onRelease: () => void
  startX: number
  startY: number
  x: number
  y: number
  timer: number
  lifted: boolean
  moved: boolean
}

// Pixels the pointer must travel before a press on the handle becomes a drag
const DRAG_THRESHOLD = 5
// How long a finger must rest on a card before it lifts, and how far it may
// drift meanwhile (any further and the touch is a scroll, not a hold)
const LONG_PRESS_MS = 400
const LONG_PRESS_TOLERANCE = 8
// Distance from the top (below the sticky header) and bottom (above the nav)
// at which the page starts scrolling while dragging
const SCROLL_ZONE_TOP = 140
const SCROLL_ZONE_BOTTOM = 110

// Drop targets are elements with data-drop-date and data-drop-slot
function findDropTarget(x: number, y: number): DropTarget | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-date][data-drop-slot]')
  if (!el?.dataset.dropDate || !el.dataset.dropSlot) return null
  return { date: el.dataset.dropDate, slot: el.dataset.dropSlot as MealSlot }
}

/**
 * Drag a meal onto another day/meal slot.
 * - Mouse: drag by the card's grip (getHandleProps). A click on the grip calls onTap.
 * - Touch: press and hold anywhere on the card (getCardProps), then drag. Releasing
 *   a held card without dragging calls onRelease. Controls marked data-no-drag
 *   (buttons inside the card) never start a hold.
 */
export function useMealDrag(onDrop: (entryId: string, target: DropTarget) => void) {
  const [drag, setDrag] = useState<MealDragState | null>(null)
  const dragRef = useRef<MealDragState | null>(null)
  const pressRef = useRef<{ entryId: string; label: string; x: number; y: number } | null>(null)
  const draggedRef = useRef(false)
  const holdRef = useRef<TouchHold | null>(null)

  const isDragging = drag !== null

  const setDragState = useCallback((next: MealDragState | null) => {
    dragRef.current = next
    setDrag(next)
  }, [])

  // Scroll the page while the pointer is held near the top or bottom edge
  useEffect(() => {
    if (!isDragging) return
    let frame = requestAnimationFrame(function tick() {
      const current = dragRef.current
      if (current) {
        const bottomZone = window.innerHeight - SCROLL_ZONE_BOTTOM
        const speed = current.y < SCROLL_ZONE_TOP
          ? -(SCROLL_ZONE_TOP - current.y) / 5
          : current.y > bottomZone
            ? (current.y - bottomZone) / 5
            : 0
        if (speed !== 0) {
          window.scrollBy(0, speed)
          setDragState({ ...current, target: findDropTarget(current.x, current.y) })
        }
      }
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [isDragging, setDragState])

  // Registered on the document only while a finger is down on a card. It has to be
  // a native, non-passive listener: React's touchmove handlers are passive, and
  // once a card has lifted the page must not scroll under it.
  const onHoldMove = useCallback((e: TouchEvent) => {
    const hold = holdRef.current
    const touch = e.touches[0]
    if (!hold || !touch) return
    hold.x = touch.clientX
    hold.y = touch.clientY

    if (!hold.lifted) {
      // Moving before the hold completes means the finger is scrolling
      if (Math.hypot(hold.x - hold.startX, hold.y - hold.startY) > LONG_PRESS_TOLERANCE) {
        clearTimeout(hold.timer)
        holdRef.current = null
        document.removeEventListener('touchmove', onHoldMove)
      }
      return
    }

    e.preventDefault()
    if (Math.hypot(hold.x - hold.startX, hold.y - hold.startY) > DRAG_THRESHOLD) hold.moved = true
    setDragState({
      entryId: hold.entryId,
      label: hold.label,
      x: hold.x,
      y: hold.y,
      target: findDropTarget(hold.x, hold.y),
    })
  }, [setDragState])

  const endHold = useCallback(() => {
    const hold = holdRef.current
    if (hold) clearTimeout(hold.timer)
    holdRef.current = null
    document.removeEventListener('touchmove', onHoldMove)
    return hold
  }, [onHoldMove])

  // Don't leave a timer or document listener behind if the page unmounts mid-press
  useEffect(() => () => {
    endHold()
  }, [endHold])

  const getHandleProps = (entryId: string, label: string, onTap: () => void): HTMLAttributes<HTMLElement> => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (e.pointerType === 'mouse') e.preventDefault() // no text selection
      e.currentTarget.setPointerCapture(e.pointerId)
      pressRef.current = { entryId, label, x: e.clientX, y: e.clientY }
      draggedRef.current = false
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const press = pressRef.current
      if (!press) return
      if (!dragRef.current && Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_THRESHOLD) return
      setDragState({
        entryId: press.entryId,
        label: press.label,
        x: e.clientX,
        y: e.clientY,
        target: findDropTarget(e.clientX, e.clientY),
      })
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const current = dragRef.current
      pressRef.current = null
      if (!current) return
      draggedRef.current = true
      setDragState(null)
      const target = findDropTarget(e.clientX, e.clientY)
      if (target) onDrop(current.entryId, target)
    },
    onPointerCancel: () => {
      pressRef.current = null
      setDragState(null)
    },
    onClick: () => {
      // The click that follows a drag isn't a tap
      if (draggedRef.current) {
        draggedRef.current = false
        return
      }
      onTap()
    },
  })

  const getCardProps = (entryId: string, label: string, onRelease: () => void): HTMLAttributes<HTMLElement> => ({
    onTouchStart: (e: ReactTouchEvent<HTMLElement>) => {
      endHold()
      const touch = e.touches[0]
      if (e.touches.length > 1 || !touch) return
      if ((e.target as HTMLElement).closest('[data-no-drag]')) return

      const hold: TouchHold = {
        entryId,
        label,
        onRelease,
        startX: touch.clientX,
        startY: touch.clientY,
        x: touch.clientX,
        y: touch.clientY,
        timer: 0,
        lifted: false,
        moved: false,
      }
      hold.timer = window.setTimeout(() => {
        hold.lifted = true
        navigator.vibrate?.(10)
        setDragState({ entryId, label, x: hold.x, y: hold.y, target: findDropTarget(hold.x, hold.y) })
      }, LONG_PRESS_MS)
      holdRef.current = hold
      document.addEventListener('touchmove', onHoldMove, { passive: false })
    },
    onTouchEnd: (e: ReactTouchEvent<HTMLElement>) => {
      const hold = endHold()
      // A quick tap: let the click through (e.g. the title opens the recipe)
      if (!hold?.lifted) return

      // After a hold, swallow the click so the title doesn't also open the recipe
      e.preventDefault()
      setDragState(null)
      if (!hold.moved) {
        hold.onRelease()
        return
      }
      const target = findDropTarget(hold.x, hold.y)
      if (target) onDrop(hold.entryId, target)
    },
    onTouchCancel: () => {
      endHold()
      setDragState(null)
    },
    // Android opens a context menu on long press; the hold replaces it
    onContextMenu: (e) => {
      if (holdRef.current) e.preventDefault()
    },
  })

  return { drag, getHandleProps, getCardProps }
}
