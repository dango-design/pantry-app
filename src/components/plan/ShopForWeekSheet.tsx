import { useState } from 'react'
import { Check, ChevronDown, ListChecks, ShoppingCart } from 'lucide-react'
import { BottomSheet } from '@/components/common'
import { formatQuantity, type ShopLine } from '@/utils/mealPlan'
import { cn } from '@/utils/cn'

interface ShopForWeekSheetProps {
  title: string
  mealCount: number
  lines: ShopLine[]
  onClose: () => void
  onConfirm: (lines: ShopLine[]) => void
}

// Review what the week's meals need before it goes on the shopping list
export function ShopForWeekSheet({ title, mealCount, lines, onClose, onConfirm }: ShopForWeekSheetProps) {
  // Required items to buy start selected. Optional ones and ones the pantry
  // may already cover (different unit) are left for the user to opt into.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(lines.filter((l) => l.status === 'buy' && !l.optional).map((l) => l.key))
  )
  const [showCovered, setShowCovered] = useState(false)

  const toBuy = lines.filter((l) => l.status === 'buy')
  const toCheck = lines.filter((l) => l.status === 'check')
  const onList = lines.filter((l) => l.status === 'on_list')
  const covered = lines.filter((l) => l.status === 'covered')
  const selectedLines = lines.filter((l) => selected.has(l.key))

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const renderSelectable = (line: ShopLine) => {
    const isSelected = selected.has(line.key)
    const pantryNote = line.status === 'check'
      ? `You have ${line.pantryMatches.map((m) => `${m.name} (${formatQuantity(m.quantity, m.quantityUnit)})`).join(', ')}`
      : line.inPantry > 0
        ? `You have ${formatQuantity(line.inPantry, line.unit)}`
        : null

    return (
      <li key={line.key}>
        <button
          onClick={() => toggle(line.key)}
          role="checkbox"
          aria-checked={isSelected}
          className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
        >
          <span
            className={cn(
              'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
              isSelected ? 'bg-primary border-primary' : 'border-gray-300'
            )}
          >
            {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-gray-900">{line.name}</span>
              {line.optional && <span className="text-xs text-gray-400">optional</span>}
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">For {line.recipes.join(', ')}</span>
            {pantryNote && (
              <span className={cn('block text-xs mt-0.5', line.status === 'check' ? 'text-amber-700' : 'text-gray-500')}>
                {pantryNote}
              </span>
            )}
          </span>
          <span className="text-sm text-gray-700 tabular-nums flex-shrink-0">
            {formatQuantity(line.toBuy, line.unit)}
          </span>
        </button>
      </li>
    )
  }

  const renderInfo = (line: ShopLine, detail: string) => (
    <li key={line.key} className="flex items-start gap-3 px-4 py-2">
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-gray-600">{line.name}</span>
        <span className="block text-xs text-gray-400 mt-0.5">{detail}</span>
      </span>
      <span className="text-sm text-gray-400 tabular-nums flex-shrink-0">
        {formatQuantity(line.needed, line.unit)}
      </span>
    </li>
  )

  const sectionTitle = (label: string, count: number, hint?: string) => (
    <div className="px-4 pt-4 pb-1">
      <h3 className="text-sm font-medium text-gray-700">
        {label} <span className="text-gray-400 font-normal">({count})</span>
      </h3>
      {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
    </div>
  )

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={title}
      subtitle={`${mealCount} planned meal${mealCount !== 1 ? 's' : ''}, scaled to servings`}
      footer={
        <button
          onClick={() => onConfirm(selectedLines)}
          disabled={selectedLines.length === 0}
          className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <ShoppingCart className="h-5 w-5" />
          {selectedLines.length > 0
            ? `Add ${selectedLines.length} item${selectedLines.length !== 1 ? 's' : ''} to list`
            : 'Nothing selected'}
        </button>
      }
    >
      <div className="pb-4">
        {toBuy.length === 0 && toCheck.length === 0 && (
          <div className="flex items-center gap-3 mx-4 mt-4 p-3 rounded-xl bg-green-50 text-green-800">
            <ListChecks className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">You have everything for these meals.</p>
          </div>
        )}

        {toBuy.length > 0 && (
          <section>
            {sectionTitle('To buy', toBuy.length)}
            <ul>{toBuy.map(renderSelectable)}</ul>
          </section>
        )}

        {toCheck.length > 0 && (
          <section>
            {sectionTitle('Check your pantry', toCheck.length, 'You have these in a different unit, so we can’t tell if it’s enough.')}
            <ul>{toCheck.map(renderSelectable)}</ul>
          </section>
        )}

        {onList.length > 0 && (
          <section>
            {sectionTitle('Already on your list', onList.length)}
            <ul>{onList.map((line) => renderInfo(line, `For ${line.recipes.join(', ')}`))}</ul>
          </section>
        )}

        {covered.length > 0 && (
          <section>
            <button
              onClick={() => setShowCovered(!showCovered)}
              aria-expanded={showCovered}
              className="w-full flex items-center justify-between px-4 pt-4 pb-1 text-left"
            >
              <h3 className="text-sm font-medium text-gray-700">
                In your pantry <span className="text-gray-400 font-normal">({covered.length})</span>
              </h3>
              <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', showCovered && 'rotate-180')} />
            </button>
            {showCovered && (
              <ul>
                {covered.map((line) =>
                  renderInfo(line, `You have ${formatQuantity(line.inPantry, line.unit)} · for ${line.recipes.join(', ')}`)
                )}
              </ul>
            )}
          </section>
        )}
      </div>
    </BottomSheet>
  )
}
