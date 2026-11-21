import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Info, Plus } from 'lucide-react'
import { Input } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { describeStock } from '@/utils/pantryMatch'
import {
  describeItem,
  describeStapleStock,
  findAtHome,
  getSuggestions,
  getUsualItems,
  resolveQuickAdd,
  type QuickAddItem,
  type QuickAddSuggestion,
} from '@/utils/quickAdd'
import { getProductMemory, isOnShoppingList } from '@/utils/stock'
import { QuickAddSuggestions } from './QuickAddSuggestions'
import { UsualItemChips } from './UsualItemChips'

// Shown under the field instead of adding right away. "Add anyway" adds the
// item the note is about.
type AddNote =
  | { kind: 'on_list'; item: QuickAddItem }
  | { kind: 'at_home'; item: QuickAddItem; name: string; detail: string }

interface QuickAddToListProps {
  placeholder?: string
  autoFocus?: boolean
  /** Say "Added …" after each add, for places where the list itself isn't visible */
  confirmAdds?: boolean
  /** Leave out the row of usual items that shows while the field is empty */
  hideUsualItems?: boolean
}

/**
 * Puts an item on the shopping list in as few taps as possible.
 *
 * While the field is empty it offers the household's usual items as chips.
 * While typing it suggests products bought before and generic food names.
 * A quantity can be typed with the name ("2 milk", "chicken 3 lb"). Every add
 * gets a heads-up first when the item is already on the list or at home.
 */
export function QuickAddToList({ placeholder = 'Add item...', autoFocus, confirmAdds, hideUsualItems }: QuickAddToListProps) {
  const inventory = useDemoStore((state) => state.inventory)
  const shoppingList = useDemoStore((state) => state.shoppingList)
  const staples = useDemoStore((state) => state.staples)
  const addShoppingItem = useDemoStore((state) => state.addShoppingItem)

  const [text, setText] = useState('')
  const [note, setNote] = useState<AddNote | null>(null)
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  // Escape closes the suggestions until the text changes
  const [isDismissed, setIsDismissed] = useState(false)
  // The highlighted suggestion, or -1 when Enter should add the typed text
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const optionId = (index: number) => `${listId}-option-${index}`

  const memory = useMemo(() => getProductMemory(inventory, staples), [inventory, staples])
  const suggestions = useMemo(
    () => getSuggestions(text, memory, staples, shoppingList, new Date()),
    [text, memory, staples, shoppingList]
  )
  const usualItems = useMemo(
    () => (hideUsualItems ? [] : getUsualItems(memory, inventory, staples, shoppingList, new Date())),
    [hideUsualItems, memory, inventory, staples, shoppingList]
  )

  // A note hides the suggestions: the list would cover it
  const isOpen = isFocused && !isDismissed && !note && suggestions.length > 0
  const active = isOpen ? suggestions[activeIndex] : undefined
  const isTyping = text.trim() !== ''

  /**
   * Adds the item, unless it is already on the list or at home. Then it shows
   * a note instead, and `anyway` skips that check. Returns true when added.
   */
  const add = (item: QuickAddItem, anyway = false): boolean => {
    if (!anyway) {
      const now = new Date()
      if (isOnShoppingList(item.name, shoppingList, now)) {
        setNote({ kind: 'on_list', item })
        return false
      }
      const atHome = findAtHome(item.name, inventory, staples, now)
      if (atHome) {
        const detail = atHome.kind === 'staple' ? describeStapleStock(atHome.stock, now) : describeStock(atHome.item)
        setNote({ kind: 'at_home', item, name: atHome.name, detail })
        return false
      }
    }

    addShoppingItem({
      shoppingListId: 'demo-list',
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      quantityUnit: item.unit,
      isChecked: false,
      source: 'manual',
      priority: 'normal',
    })
    setNote(null)
    setText('')
    setActiveIndex(-1)
    setLastAdded(describeItem(item))
    return true
  }

  // Enter with nothing highlighted, and the + button
  const addTyped = () => {
    // The note stays up only while the text is unchanged, so adding again means "add anyway"
    if (note && isTyping) {
      add(note.item, true)
      return
    }
    const item = resolveQuickAdd(text, memory, staples)
    if (item) add(item)
  }

  const pickSuggestion = (suggestion: QuickAddSuggestion) => {
    if (!suggestion.onList) add(suggestion)
  }

  // Arrow keys go through the suggestions that can be added, with one extra
  // stop for "nothing highlighted" between the last and the first.
  const moveHighlight = (step: 1 | -1) => {
    const stops = [-1, ...suggestions.flatMap((suggestion, index) => (suggestion.onList ? [] : [index]))]
    const current = Math.max(0, stops.indexOf(isOpen ? activeIndex : -1))
    setActiveIndex(stops[(current + step + stops.length) % stops.length])
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter and the arrow keys belong to the input method while it is composing text
    if (e.nativeEvent.isComposing) return

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (note || suggestions.length === 0) return
      e.preventDefault()
      setIsDismissed(false)
      moveHighlight(e.key === 'ArrowDown' ? 1 : -1)
    } else if (e.key === 'Enter') {
      if (active) pickSuggestion(active)
      else addTyped()
    } else if (e.key === 'Escape' && isOpen) {
      // Close only the suggestions. Without this the sheet around the field would close too
      e.stopPropagation()
      setIsDismissed(true)
      setActiveIndex(-1)
    }
  }

  return (
    <div>
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder={placeholder}
            className="h-10 border-gray-200"
            aria-label="Item to add to your shopping list"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={isOpen ? listId : undefined}
            aria-activedescendant={active ? optionId(activeIndex) : undefined}
            autoComplete="off"
            value={text}
            autoFocus={autoFocus}
            onChange={(e) => {
              setText(e.target.value)
              // Typing means the field has focus, even if the focus event was missed
              setIsFocused(true)
              setNote(null)
              setLastAdded(null)
              setIsDismissed(false)
              setActiveIndex(-1)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false)
              setActiveIndex(-1)
            }}
          />
          <button
            type="button"
            onClick={addTyped}
            aria-label="Add to shopping list"
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg border border-primary-muted bg-primary-soft text-primary hover:bg-primary-muted transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {isOpen && (
          <QuickAddSuggestions
            id={listId}
            optionId={optionId}
            suggestions={suggestions}
            activeIndex={activeIndex}
            onHighlight={setActiveIndex}
            onPick={pickSuggestion}
          />
        )}
      </div>

      {/* While typing, the chips are hidden but keep their height, so the field and the page below it
          do not move on the first keystroke. A note takes their place. */}
      {usualItems.length > 0 && !(isTyping && note) && (
        <UsualItemChips
          items={usualItems}
          hidden={isTyping}
          onAdd={(item, fromKeyboard) => {
            // A chip adds in one tap, with no "at home" note: it already shows "Out" or "Low",
            // and items on the list have no chip. The chip goes away once its item is added.
            // Keyboard focus was on it, so move it to the field.
            if (add(item, true) && fromKeyboard) inputRef.current?.focus()
          }}
        />
      )}

      {note && (
        <div role="status" className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-900">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-700" />
          <div className="flex-1 min-w-0">
            {note.kind === 'on_list' ? (
              <p>Already on your list</p>
            ) : (
              <>
                <p>You have {note.name} at home</p>
                <p className="text-xs text-amber-800">{note.detail}</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => add(note.item, true)}
            className="flex-shrink-0 font-medium underline underline-offset-2 hover:text-amber-950"
          >
            Add anyway
          </button>
        </div>
      )}

      {/* Without confirmAdds the list itself shows the new item, so only screen readers get this line */}
      {lastAdded && !note && (
        <p role="status" className={confirmAdds ? 'mt-2 flex items-center gap-1 text-sm text-green-700' : 'sr-only'}>
          <Check className="h-4 w-4 flex-shrink-0" />
          Added {lastAdded} to your shopping list
        </p>
      )}
    </div>
  )
}
