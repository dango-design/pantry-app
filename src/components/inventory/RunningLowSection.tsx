import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { cn } from '@/utils/cn'
import { CATEGORY_TONES } from '@/utils/constants'
import { StatusPill } from './StatusPill'
import type { LowRow } from './useRunningLowRows'

// Rows shown before "Show all"
const MAX_ROWS = 5

interface RunningLowSectionProps {
  /** From useRunningLowRows() */
  rows: LowRow[]
  /** Open the "Keep in stock" sheet for this product */
  onOpenStaple: (name: string) => void
  /** Show a message, with undo when the action can be taken back */
  onNotify: (message: string, undo?: () => void) => void
}

/**
 * The "Running low" list, shown under its summary tile: one line per product
 * with why it is listed and an "Add to list" button. Pass the rows from
 * useRunningLowRows(). Renders nothing when there are none.
 */
export function RunningLowSection({ rows, onOpenStaple, onNotify }: RunningLowSectionProps) {
  const navigate = useNavigate()
  const { addShoppingItem, removeShoppingItem, updateStaple } = useDemoStore()
  const [showAll, setShowAll] = useState(false)

  if (rows.length === 0) return null
  const visible = showAll ? rows : rows.slice(0, MAX_ROWS)

  const handleOpen = (row: LowRow) => {
    // A product with something left has a pantry row to show. A staple, or a
    // product with nothing left, opens the "Keep in stock" sheet.
    if (!row.staple && row.itemId) navigate(`/item/${row.itemId}`)
    else onOpenStaple(row.name)
  }

  const handleAdd = (row: LowRow) => {
    const staple = row.staple
    const listItem = addShoppingItem({
      shoppingListId: 'demo-list',
      name: row.name,
      quantity: row.quantity,
      quantityUnit: row.unit,
      category: row.category,
      isChecked: false,
      source: 'low_stock',
      priority: 'normal',
    })
    onNotify(`${row.name} added to your shopping list`, () => {
      removeShoppingItem(listItem.id)
      // Taking a low staple off the list marks it "not now". Put that mark back as it was.
      if (staple) updateStaple(staple.id, { skippedAt: staple.skippedAt })
    })
  }

  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {visible.map((row) => {
          const tone = CATEGORY_TONES[row.category] ?? CATEGORY_TONES.other
          return (
            <li key={row.key} className="flex items-center gap-2 pl-3 pr-2">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tone.strip }} />
              <button
                type="button"
                onClick={() => handleOpen(row)}
                className="min-w-0 flex-1 py-2 text-left"
              >
                <span className="block truncate text-sm font-medium text-gray-900">{row.name}</span>
                <span className={cn('block truncate text-xs', row.reason === 'out' ? 'text-red-700' : 'text-gray-500')}>
                  {row.detail}
                </span>
              </button>

              {row.onList ? (
                <StatusPill tone="grey" className="shrink-0">On your list</StatusPill>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAdd(row)}
                  className="shrink-0 min-h-[40px]"
                  aria-label={`Add ${row.name} to shopping list`}
                >
                  Add to list
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {rows.length > MAX_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          aria-expanded={showAll}
          className="block w-full border-t border-gray-100 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {showAll ? 'Show fewer' : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  )
}
