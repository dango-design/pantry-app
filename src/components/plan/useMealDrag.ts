import { useEffect, useRef, useState, type HTMLAttributes, type PointerEvent } from 'react'
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

// Pixels the pointer must travel before a press on the handle becomes a drag
const DRAG_THRESHOLD = 5
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
 * Drag a meal by its handle onto another day/meal slot. Works for mouse and
 * touch through pointer events. A tap on the handle (no drag) calls onTap,
 * so the handle also opens the move sheet for keyboard and tap users.
 */
export function useMealDrag(onDrop: (entryId: string, target: DropTarget) => void) {
  const [drag, setDrag] = useState<MealDragState | null>(null)
  const dragRef = useRef<MealDragState | null>(null)
  const pressRef = useRef<{ entryId: string; label: string; x: number; y: number } | null>(null)
  const draggedRef = useRef(false)

  const isDragging = drag !== null

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
          const next = { ...current, target: findDropTarget(current.x, current.y) }
          dragRef.current = next
          setDrag(next)
        }
      }
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [isDragging])

  const setDragState = (next: MealDragState | null) => {
    dragRef.current = next
    setDrag(next)
  }

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

  return { drag, getHandleProps }
}
