import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { BottomSheet, Button, Input } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { cn } from '@/utils/cn'
import { QUANTITY_UNITS } from '@/utils/constants'
import { describeRunOut, formatStockCount, getDailyUse, getStock, learnDailyUse, productKey, roundStockCount } from '@/utils/stock'
import { convertQuantity, isDiscreteUnit } from '@/utils/units'
import type { FoodItem, QuantityUnit, Staple } from '@/types'
import { describeDailyUse, shownCount } from './stockHelpers'

interface StapleSheetProps {
  /** The product's name. It does not have to be a staple yet. */
  name: string
  onClose: () => void
  /** Called after "Stop keeping in stock", with the staple as it was, so the page can offer undo */
  onRemoved?: (staple: Staple) => void
}

// A number typed into a field. Null when the field is empty or not a number 0 or above.
function parseAmount(text: string): number | null {
  if (text.trim() === '') return null
  const value = Number(text)
  return Number.isFinite(value) && value >= 0 ? value : null
}

// How many separate days this product was bought on, counting only rows the daily use is worked out from
function countPurchases(rows: FoodItem[], unit: QuantityUnit): number {
  const dates = new Set<string>()
  for (const row of rows) {
    const amount = convertQuantity(row.originalQuantity, row.quantityUnit, unit)
    if (amount !== null && amount > 0) dates.add(row.purchaseDate)
  }
  return dates.size
}

const ROUND_BUTTON =
  'w-11 h-11 shrink-0 rounded-full border border-primary-muted bg-primary-soft text-primary flex items-center justify-center hover:bg-primary-muted transition-colors touch-manipulation disabled:opacity-40 disabled:pointer-events-none'

/**
 * Settings for keeping a product in stock: how many to keep, how many to buy,
 * and how fast it gets used. Also the place to correct the count when the
 * estimate is wrong. Works for a product that is not a staple yet: saving
 * makes it one.
 *
 * The fields start from the store when the sheet opens. Give it a `key` so a
 * different product starts fresh.
 */
export function StapleSheet({ name, onClose, onRemoved }: StapleSheetProps) {
  const { inventory, staples, addStaple, updateStaple, removeStaple, setStock } = useDemoStore()

  const stock = getStock(name, inventory, staples)
  const staple = stock.staple
  const unit = stock.unit
  const discrete = isDiscreteUnit(unit)
  const unitLabel = QUANTITY_UNITS[unit]?.shortLabel || ''

  const rows = inventory.filter((item) => productKey(item.name) === stock.key)
  const lastBought = [...rows].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))[0]

  // Daily use worked out from purchases. When there is one, the app uses it and ignores the typed number.
  const dailyUse = staple ? getDailyUse(staple, inventory) : undefined
  const learnedRate = staple
    ? dailyUse?.source === 'learned' ? dailyUse.rate : undefined
    : learnDailyUse(stock.name, inventory, unit)
  const purchases = countPurchases(rows, unit)

  // Starting values for a product that is not a staple yet: buy what was
  // bought last time, and warn at the last one (or the last quarter by weight or volume).
  const lastAmount = lastBought && convertQuantity(lastBought.originalQuantity, lastBought.quantityUnit, unit)
  const usualBuy = roundStockCount(lastAmount || shownCount(stock) || 1, unit) || 1
  const [minText, setMinText] = useState(() => String(staple?.minQuantity ?? (discrete ? 1 : roundStockCount(usualBuy / 4, unit))))
  const [buyText, setBuyText] = useState(() => String(staple?.buyQuantity ?? usualBuy))
  const [useText, setUseText] = useState(() => (staple?.dailyUse ? String(staple.dailyUse) : ''))
  const [autoAdd, setAutoAdd] = useState(() => staple?.autoAdd ?? true)
  const [leftText, setLeftText] = useState(() => String(shownCount(stock)))

  const minQuantity = parseAmount(minText)
  const buyQuantity = parseAmount(buyText)
  const typedUse = useText.trim() === '' ? 0 : parseAmount(useText)
  const left = parseAmount(leftText)

  const minError = minQuantity === null ? 'Enter 0 or more' : undefined
  const buyError = buyQuantity === null || buyQuantity <= 0 ? 'Enter more than 0' : undefined
  const useError = typedUse === null ? 'Enter a number, or leave it empty' : undefined
  const leftError = left === null ? 'Enter 0 or more' : undefined
  const canSave = !minError && !buyError && !useError && !leftError

  const stepLeft = (delta: number) => {
    const next = Math.max(0, (left ?? 0) + delta)
    setLeftText(String(roundStockCount(next, unit)))
  }

  const handleSave = () => {
    if (minQuantity === null || buyQuantity === null || typedUse === null || left === null) return

    const settings = {
      minQuantity,
      buyQuantity,
      dailyUse: typedUse > 0 ? typedUse : undefined,
      autoAdd,
    }
    if (staple) {
      updateStaple(staple.id, settings)
    } else {
      addStaple({ name: stock.name, category: stock.category, unit, ...settings })
    }

    // Make the pantry match "How many are left?". Read the store again first:
    // a new daily use changes the estimate, and the number in the field is the
    // one the user saw and agreed to. When they already match, leave the rows
    // alone, so an estimate nobody corrected is not recorded as a count.
    const count = roundStockCount(left, unit)
    const saved = useDemoStore.getState()
    if (shownCount(getStock(name, saved.inventory, saved.staples)) !== count) {
      setStock(name, count)
    }
    onClose()
  }

  const handleRemove = () => {
    if (!staple) return
    removeStaple(staple.id)
    onRemoved?.(staple)
    onClose()
  }

  // "About 3 left", "12 left", "None left"
  const headline = shownCount(stock) > 0 ? `${formatStockCount(stock)} left` : 'None left'
  const runOut = describeRunOut(stock)

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Keep in stock"
      subtitle={stock.name}
      footer={
        <Button onClick={handleSave} disabled={!canSave} className="w-full" size="lg">
          {staple ? 'Save' : 'Keep in stock'}
        </Button>
      }
    >
      <div className="p-4 space-y-5">
        {/* What the app thinks is in the pantry now */}
        <div className="rounded-lg bg-primary-soft px-4 py-3">
          <p className="text-base font-medium text-gray-900">
            {headline}
            {runOut && <span className="font-normal text-gray-600"> · {runOut}</span>}
          </p>
          {stock.isEstimate && (
            <p className="text-sm text-gray-600 mt-0.5">
              This is an estimate from your last count and how much you use a day.
            </p>
          )}
        </div>

        {/* The count. Saving a different number corrects the estimate. */}
        <div>
          <label htmlFor="staple-left" className="block text-sm font-medium text-gray-700 mb-2">
            How many are left?
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => stepLeft(-1)}
              disabled={(left ?? 0) <= 0}
              aria-label="One less"
              className={ROUND_BUTTON}
            >
              <Minus className="h-5 w-5" />
            </button>
            <input
              id="staple-left"
              type="number"
              inputMode={discrete ? 'numeric' : 'decimal'}
              min={0}
              step={discrete ? 1 : 'any'}
              value={leftText}
              onChange={(e) => setLeftText(e.target.value)}
              className={cn(
                'w-20 rounded-lg border border-gray-300 px-2 py-2 text-center text-base font-medium',
                'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                leftError && 'border-red-500'
              )}
            />
            <button type="button" onClick={() => stepLeft(1)} aria-label="One more" className={ROUND_BUTTON}>
              <Plus className="h-5 w-5" />
            </button>
            {unitLabel && <span className="text-sm text-gray-500">{unitLabel}</span>}
          </div>
          {leftError ? (
            <p className="mt-1 text-sm text-red-600">{leftError}</p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Change this when the number above is wrong.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="staple-min"
            label="Keep at least"
            type="number"
            inputMode={discrete ? 'numeric' : 'decimal'}
            min={0}
            step={discrete ? 1 : 'any'}
            value={minText}
            onChange={(e) => setMinText(e.target.value)}
            error={minError}
            hint="Running low at this many"
          />
          <Input
            id="staple-buy"
            label="Buy this many"
            type="number"
            inputMode={discrete ? 'numeric' : 'decimal'}
            min={0}
            step={discrete ? 1 : 'any'}
            value={buyText}
            onChange={(e) => setBuyText(e.target.value)}
            error={buyError}
            hint="Goes on your shopping list"
          />
        </div>

        {/* Daily use: typed by the user, or worked out from purchases when there are enough */}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <label htmlFor="staple-use">We use about</label>
            <input
              id="staple-use"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={useText}
              onChange={(e) => setUseText(e.target.value)}
              className={cn(
                'w-20 rounded-lg border border-gray-300 px-2 py-2 text-center text-base md:text-sm font-normal',
                'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                useError && 'border-red-500'
              )}
            />
            <span>{unitLabel ? `${unitLabel} a day` : 'a day'}</span>
          </div>
          {useError ? (
            <p className="mt-1 text-sm text-red-600">{useError}</p>
          ) : learnedRate !== undefined ? (
            <p className="mt-2 rounded-lg bg-primary-soft px-3 py-2 text-sm text-gray-700">
              {describeDailyUse(learnedRate, unit)}, worked out from your last {purchases} purchases.
              The app uses this in place of the number you type.
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              Leave it empty if you are not sure. After 3 purchases the app works it out.
            </p>
          )}
        </div>

        {/* Auto-add switch. The whole row is the control. */}
        <button
          type="button"
          role="switch"
          aria-checked={autoAdd}
          onClick={() => setAutoAdd(!autoAdd)}
          className="w-full min-h-[44px] flex items-center justify-between gap-4 text-left"
        >
          <span>
            <span className="block text-sm font-medium text-gray-700">Add to the shopping list automatically</span>
            <span className="block text-sm text-gray-500">When it is running low or out</span>
          </span>
          <span
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors',
              autoAdd ? 'bg-primary' : 'bg-gray-300'
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                autoAdd && 'translate-x-5'
              )}
            />
          </span>
        </button>

        {staple && (
          <button
            type="button"
            onClick={handleRemove}
            className="w-full py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
          >
            Stop keeping in stock
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
