import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Minus, Plus, Clock, MapPin, Tag, ShoppingCart, CheckCircle2, ChevronRight, Edit2, Repeat, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, Dialog, DialogActions, Snackbar } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { CATEGORIES, CATEGORY_TONES, STORAGE_LOCATIONS, QUANTITY_UNITS } from '@/utils/constants'
import { calculateFreshnessScore, formatExpirationText, getFreshnessLevel, FRESHNESS_COLORS } from '@/utils/freshness'
import { formatDateString } from '@/utils/dates'
import { FoodThumbnail } from '@/components/icons'
import {
  StapleSheet,
  describeDailyUse,
  emptyProduct,
  restoreStaple,
  shownCount,
  snapshotStock,
  useAddToList,
} from '@/components/inventory'
import { PageHeader, pageContainer } from '@/components/layout'
import { LazyItemAllergySection } from '@/components/allergy/lazy'
import { BarcodeScanner } from '@/components/smart-input'
import { cn } from '@/utils/cn'
import { formatQuantity } from '@/utils/mealPlan'
import { describeRunOut, formatStockCount, getStock } from '@/utils/stock'

// Snackbar state type
interface SnackbarState {
  open: boolean
  message: string
  undoAction?: () => void
  /** Goes up with each message, so a new message gets its own full time on screen */
  id: number
}

// Smallest amount, and step, in the "Use item" dialog
const USE_STEP = 0.5

export function ItemDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { inventory, staples, deleteItem, adjustStock, updateItem } = useDemoStore()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUseDialog, setShowUseDialog] = useState(false)
  const [showStapleSheet, setShowStapleSheet] = useState(false)
  const [useQuantity, setUseQuantity] = useState(1)
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', id: 0 })
  const [scanningBarcode, setScanningBarcode] = useState(false)

  // True after the product was used up from this page. The page then goes
  // back to the pantry when the message closes, unless Undo brought the
  // product back. It waits until then so that Undo can still be tapped:
  // leaving at once would remove the message.
  const usedUpHere = useRef(false)

  const showSnackbar = useCallback((message: string, undoAction?: () => void, usedUp = false) => {
    if (usedUp) usedUpHere.current = true
    setSnackbar((prev) => ({ open: true, message, undoAction, id: prev.id + 1 }))
  }, [])

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ open: false, message: '', id: prev.id }))
    if (!usedUpHere.current) return
    usedUpHere.current = false

    // Read the store now: Undo may have put the product back
    const current = useDemoStore.getState()
    const row = current.inventory.find((i) => i.id === id)
    if (!row || shownCount(getStock(row.name, current.inventory, current.staples)) <= 0) navigate('/')
  }, [id, navigate])

  // The message can close just after the page is left by other means. Do not send the user anywhere then.
  useEffect(() => () => {
    usedUpHere.current = false
  }, [])

  const item = useMemo(() => {
    return inventory.find((i) => i.id === id)
  }, [inventory, id])

  // "Buy more" asks first when the product is still in stock. Only the
  // "I'm out of it" choice empties the pantry, so only then go back.
  const { requestAdd, sheet: addToListSheet } = useAddToList(({ message, undo, usedUp }) => {
    showSnackbar(message, undo, usedUp)
  })

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Item not found</p>
          <Button onClick={() => navigate('/')}>Go home</Button>
        </div>
      </div>
    )
  }

  const category = CATEGORIES[item.category] || CATEGORIES.other
  const location = STORAGE_LOCATIONS[item.storageLocation] || { label: item.storageLocation, color: '#6B7280' }
  const freshnessLevel = getFreshnessLevel(item.expirationDate)
  const freshnessScore = calculateFreshnessScore(item.purchaseDate, item.expirationDate)
  const tone = CATEGORY_TONES[item.category] || CATEGORY_TONES.other

  // The product this row belongs to: the count across all of its rows. For a
  // staple the count is the estimate, not the quantity stored on the rows.
  const stock = getStock(item.name, inventory, staples)
  const staple = stock.staple
  const available = shownCount(stock)
  const unitLabel = QUANTITY_UNITS[stock.unit]?.shortLabel || ''
  const otherRows = stock.items.filter((row) => row.id !== item.id)
  const runOut = describeRunOut(stock)

  const openUseDialog = () => {
    setUseQuantity(Math.min(1, available))
    setShowUseDialog(true)
  }

  // Takes the amount from the product. Rows that expire soonest are used first.
  const handleUse = () => {
    adjustStock(item.name, -useQuantity)
    setShowUseDialog(false)

    // If fully consumed, go back
    if (available - useQuantity <= 0) {
      navigate('/')
    }
  }

  // The whole product goes to zero. The rows are remembered first, so undo
  // puts back exactly what was there.
  const handleMarkUsed = () => {
    const restore = snapshotStock(item.name)
    emptyProduct(item.name)
    showSnackbar(`${item.name} removed from pantry`, restore, true)
  }

  const handleRemove = () => {
    deleteItem(item.id)
    navigate('/')
  }

  // Attach a barcode to an item typed by hand, so it can be checked for allergens.
  if (scanningBarcode) {
    return (
      <BarcodeScanner
        title="Scan this item's barcode"
        onScan={(product, lookup) => {
          updateItem(item.id, { gtin: lookup.gtin, barcode: lookup.gtin, brand: item.brand ?? product.brand ?? undefined })
          setScanningBarcode(false)
        }}
        onCancel={() => setScanningBarcode(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Item details"
        actions={
          <button
            onClick={() => navigate(`/item/${item.id}/edit`)}
            className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Edit item"
          >
            <Edit2 className="h-5 w-5" />
          </button>
        }
      />

      <div className={cn(pageContainer('narrow'), 'py-4 space-y-4 md:py-6')}>
        {/* Main Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Category indicator */}
              <div
                className="w-2 h-20 rounded-full flex-shrink-0"
                style={{ backgroundColor: tone.strip }}
              />

              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{item.name}</h2>

                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-gray-600">
                    {formatStockCount(stock)} left
                    {stock.items.length > 1 && ` in ${stock.items.length} batches`}
                  </span>
                  <span
                    className="flex items-center gap-1"
                    style={{ color: FRESHNESS_COLORS[freshnessLevel] }}
                  >
                    <Clock className="h-4 w-4" />
                    {formatExpirationText(item.expirationDate)}
                  </span>
                </div>

                {/* Freshness bar */}
                <div className="mt-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${freshnessScore}%`,
                        backgroundColor: FRESHNESS_COLORS[freshnessLevel],
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {freshnessScore}% freshness remaining
                  </p>
                </div>
              </div>

              {/* Food Icon */}
              <div className="flex-shrink-0">
                <FoodThumbnail
                  name={item.name}
                  category={item.category}
                  imageUrl={item.imageUrl}
                  iconSize={32}
                  className="w-16 h-16 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${category.color}15` }}
              >
                <Tag className="h-5 w-5" style={{ color: category.color }} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium">{category.label}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${location.color}15` }}
              >
                <MapPin className="h-5 w-5" style={{ color: location.color }} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{location.label}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Purchased</span>
                <span>{formatDateString(item.purchaseDate)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-500">Expires</span>
                <span>{formatDateString(item.expirationDate)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-500">Added via</span>
                <span className="capitalize">{item.addedVia}</span>
              </div>
            </div>

            {item.notes && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-sm">{item.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allergies: the full result for items with product data */}
        <section aria-label="Allergies" className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Allergies</h2>
          <Suspense fallback={null}>
            <LazyItemAllergySection gtin={item.gtin} itemName={item.name} onScanBarcode={() => setScanningBarcode(true)} />
          </Suspense>
        </section>

        {/* Other rows of the same product */}
        {otherRows.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Other batches</p>
              <ul className="mt-1 divide-y divide-gray-100">
                {otherRows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/item/${row.id}`)}
                      className="w-full flex items-center gap-3 py-2.5 text-left text-sm"
                    >
                      <span className="flex-1 min-w-0 truncate">
                        {/* An estimate covers the whole product, so the amount on one row would not add up */}
                        {!stock.isEstimate && `${formatQuantity(row.quantity, row.quantityUnit)} · `}
                        Bought {formatDateString(row.purchaseDate)}
                      </span>
                      <span
                        className="flex-shrink-0"
                        style={{ color: FRESHNESS_COLORS[getFreshnessLevel(row.expirationDate)] }}
                      >
                        Expires {formatDateString(row.expirationDate)}
                      </span>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Keep in stock: shows the settings for a staple, or offers to make the product one */}
        <Card>
          <button
            type="button"
            onClick={() => setShowStapleSheet(true)}
            className="w-full flex items-center gap-3 p-4 text-left rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center flex-shrink-0">
              <Repeat className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium flex items-center gap-2">
                Keep in stock
                {staple && stock.status === 'low' && <Badge variant="warning" size="sm">Running low</Badge>}
                {staple && stock.status === 'out' && <Badge variant="danger" size="sm">Out</Badge>}
              </p>
              {staple ? (
                <>
                  <p className="text-sm text-gray-500">
                    Keep at least {formatQuantity(staple.minQuantity, staple.unit)} · Buy {formatQuantity(staple.buyQuantity, staple.unit)} at a time
                  </p>
                  {stock.dailyUse !== undefined && (
                    <p className="text-sm text-gray-500">
                      {describeDailyUse(stock.dailyUse, stock.unit)}
                      {runOut && ` · ${runOut}`}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Get a warning before you run out</p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
          </button>
        </Card>

        {/* Actions: one filled primary, soft secondaries, and Remove as a quiet text link */}
        <div className="space-y-3">
          {/* Still works at "About 0 left": that is an estimate, and this confirms it */}
          <Button onClick={handleMarkUsed} disabled={stock.items.length === 0} className="w-full" size="lg">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Used it all
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={openUseDialog}
              disabled={available <= 0}
              variant="secondary"
              className="flex-1"
              size="lg"
            >
              <SlidersHorizontal className="h-5 w-5 mr-2" />
              Used some
            </Button>
            <Button
              onClick={() => requestAdd(item)}
              variant="secondary"
              className="flex-1"
              size="lg"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Buy more
            </Button>
          </div>

          <button
            onClick={() => setShowDeleteDialog(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Remove from pantry
          </button>
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Remove item"
        description="Are you sure you want to remove this item from your pantry? This action cannot be undone."
      >
        <DialogActions>
          <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRemove}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Use item Dialog */}
      <Dialog
        open={showUseDialog}
        onClose={() => setShowUseDialog(false)}
        title="Use item"
        description={`How much ${item.name} did you use?`}
      >
        <div className="flex items-center justify-center gap-4 py-4">
          <button
            onClick={() => setUseQuantity(Math.max(Math.min(USE_STEP, available), useQuantity - USE_STEP))}
            aria-label="Less"
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <Minus className="h-5 w-5" />
          </button>

          <div className="text-center">
            <p className="text-3xl font-bold">{useQuantity}</p>
            <p className="text-sm text-gray-500">{unitLabel || 'units'}</p>
          </div>

          <button
            onClick={() => setUseQuantity(Math.min(available, useQuantity + USE_STEP))}
            aria-label="More"
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mb-4">
          {formatQuantity(Math.max(0, available - useQuantity), stock.unit)} will remain
        </p>

        <DialogActions>
          <Button variant="secondary" onClick={() => setShowUseDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleUse}>
            Use {useQuantity} {unitLabel}
          </Button>
        </DialogActions>
      </Dialog>

      {/* "You still have …" confirmation for Buy more */}
      {addToListSheet}

      {/* "Keep in stock" sheet. Opened fresh each time, so its fields start from the saved settings. */}
      {showStapleSheet && (
        <StapleSheet
          name={item.name}
          onClose={() => setShowStapleSheet(false)}
          onRemoved={(removed) =>
            showSnackbar(`Stopped keeping ${removed.name} in stock`, () => restoreStaple(removed))
          }
        />
      )}

      {/* Snackbar */}
      <Snackbar
        key={snackbar.id}
        open={snackbar.open}
        message={snackbar.message}
        onClose={closeSnackbar}
        onUndo={snackbar.undoAction}
      />
    </div>
  )
}
