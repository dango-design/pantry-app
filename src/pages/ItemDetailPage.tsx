import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, Clock, MapPin, Tag, ShoppingCart, CheckCircle2, Edit2, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Button, Card, CardContent, Dialog, DialogActions, Snackbar } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { CATEGORIES, CATEGORY_TONES, STORAGE_LOCATIONS, QUANTITY_UNITS } from '@/utils/constants'
import { calculateFreshnessScore, formatExpirationText, getFreshnessLevel, FRESHNESS_COLORS } from '@/utils/freshness'
import { formatDateString } from '@/utils/dates'
import { FoodThumbnail } from '@/components/icons'
import { useAddToList } from '@/components/inventory'

// Snackbar state type
interface SnackbarState {
  open: boolean
  message: string
  undoAction?: () => void
}

export function ItemDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { inventory, deleteItem, consumeItem, updateItem } = useDemoStore()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUseDialog, setShowUseDialog] = useState(false)
  const [useQuantity, setUseQuantity] = useState(1)
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '' })

  const item = useMemo(() => {
    return inventory.find((i) => i.id === id)
  }, [inventory, id])

  // "Buy more" asks first when the item is still in stock. Only the
  // "Used it up" choice empties the item, so only then go back.
  const { requestAdd, sheet: addToListSheet } = useAddToList(({ message, undo, usedUp }) => {
    setSnackbar({ open: true, message, undoAction: undo })
    if (usedUp) setTimeout(() => navigate('/'), 300)
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
  const unitLabel = QUANTITY_UNITS[item.quantityUnit]?.shortLabel || ''
  const tone = CATEGORY_TONES[item.category] || CATEGORY_TONES.other


  const handleUse = () => {
    consumeItem(item.id, useQuantity)
    setShowUseDialog(false)

    // If fully consumed, go back
    if (item.quantity - useQuantity <= 0) {
      navigate('/')
    }
  }

  const handleMarkUsed = () => {
    const previousQuantity = item.quantity
    consumeItem(item.id, item.quantity) // Sets quantity to 0

    setSnackbar({
      open: true,
      message: `${item.name} removed from pantry`,
      undoAction: () => {
        updateItem(item.id, { quantity: previousQuantity, status: 'active', consumedAt: undefined })
      },
    })

    // Navigate back after a short delay
    setTimeout(() => navigate('/'), 300)
  }

  const handleRemove = () => {
    deleteItem(item.id)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Item details</h1>
          <button
            onClick={() => navigate(`/item/${item.id}/edit`)}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
            aria-label="Edit item"
          >
            <Edit2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
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
                    Qty: {item.quantity} {unitLabel}
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

        {/* Actions: one filled primary, soft secondaries, and Remove as a quiet text link */}
        <div className="space-y-3">
          <Button onClick={handleMarkUsed} className="w-full" size="lg">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Used it all
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowUseDialog(true)}
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
            onClick={() => setUseQuantity(Math.max(0.5, useQuantity - 0.5))}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <Minus className="h-5 w-5" />
          </button>

          <div className="text-center">
            <p className="text-3xl font-bold">{useQuantity}</p>
            <p className="text-sm text-gray-500">{unitLabel || 'units'}</p>
          </div>

          <button
            onClick={() => setUseQuantity(Math.min(item.quantity, useQuantity + 0.5))}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mb-4">
          {item.quantity - useQuantity} {unitLabel} will remain
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

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        onClose={() => setSnackbar({ open: false, message: '' })}
        onUndo={snackbar.undoAction}
      />
    </div>
  )
}
