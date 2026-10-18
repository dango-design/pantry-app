import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, Clock, MapPin, Tag, ShoppingCart, CheckCircle2, Edit2 } from 'lucide-react'
import { Button, Card, CardContent, Dialog, DialogActions, Snackbar } from '@/components/common'
import { useDemoStore } from '@/stores/demoStore'
import { CATEGORIES, CATEGORY_TONES, STORAGE_LOCATIONS, QUANTITY_UNITS } from '@/utils/constants'
import { calculateFreshnessScore, formatExpirationText, getFreshnessLevel, FRESHNESS_COLORS } from '@/utils/freshness'
import { formatDateString } from '@/utils/dates'
import { FoodThumbnail } from '@/components/icons'

// Snackbar state type
interface SnackbarState {
  open: boolean
  message: string
  undoAction?: () => void
}

export function ItemDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { inventory, deleteItem, consumeItem, updateItem, addShoppingItem } = useDemoStore()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUseDialog, setShowUseDialog] = useState(false)
  const [useQuantity, setUseQuantity] = useState(1)
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '' })

  const item = useMemo(() => {
    return inventory.find((i) => i.id === id)
  }, [inventory, id])

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Item not found</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
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

  const handleAddToGroceryList = () => {
    const previousQuantity = item.quantity
    consumeItem(item.id, item.quantity) // Sets quantity to 0

    // Add to shopping list
    const newShoppingItem = addShoppingItem({
      shoppingListId: 'demo-list',
      name: item.name,
      quantity: item.quantity,
      quantityUnit: item.quantityUnit,
      category: item.category,
      isChecked: false,
      source: 'low_stock',
      sourceItemId: item.id,
      priority: 'normal',
    })

    setSnackbar({
      open: true,
      message: `${item.name} added to grocery list`,
      undoAction: () => {
        updateItem(item.id, { quantity: previousQuantity, status: 'active', consumedAt: undefined })
        useDemoStore.getState().removeShoppingItem(newShoppingItem.id)
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
          <h1 className="text-lg font-semibold text-gray-900">Item Details</h1>
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

        {/* Actions */}
        <div className="space-y-3">
          {/* Primary action: Add to Grocery List */}
          <Button
            onClick={handleAddToGroceryList}
            className="w-full bg-teal-500 hover:bg-teal-600"
            size="lg"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Add to Grocery List
          </Button>

          {/* Secondary action: Mark as Used */}
          <Button
            onClick={handleMarkUsed}
            className="w-full bg-primary hover:bg-primary-hover"
            size="lg"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Mark as Used
          </Button>

          {/* Tertiary actions: Used Some / Remove */}
          <div className="flex gap-3">
            <Button
              onClick={() => setShowUseDialog(true)}
              variant="secondary"
              className="flex-1"
              size="lg"
            >
              Used Some
            </Button>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="secondary"
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              size="lg"
            >
              Remove
            </Button>
          </div>
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Remove Item"
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

      {/* Use Item Dialog */}
      <Dialog
        open={showUseDialog}
        onClose={() => setShowUseDialog(false)}
        title="Use Item"
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
