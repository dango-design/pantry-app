import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MoreVertical, ChevronDown, Camera, Barcode, Receipt, Loader2 } from 'lucide-react'
import { Button } from '@/components/common'
import { PhotoCapture, BarcodeScanner, ItemReviewList, type ReviewItem } from '@/components/smart-input'
import { useDemoStore, DEMO_HOUSEHOLD, DEMO_USER } from '@/stores/demoStore'
import { CATEGORIES, QUANTITY_UNITS, STORAGE_LOCATIONS } from '@/utils/constants'
import { todayDateString } from '@/utils/dates'
import { calculateFreshnessScore } from '@/utils/freshness'
import { estimateExpirationDate, getDefaultStorageLocation, lookupFood } from '@/utils/foodDatabase'
import { getFoodIcon } from '@/components/icons'
import {
  processGroceryImage,
  processReceipt,
  type DetectedItem,
  type ReceiptItem,
  type BarcodeProduct,
} from '@/services'
import type { FoodCategory, StorageLocation, QuantityUnit } from '@/types'

// Quick add items - commonly added items
const QUICK_ADD_ITEMS = [
  'Almond Milk',
  'Banana',
  'Eggs',
  'Bread',
  'Chicken Breast',
  'Avocado',
  'Greek Yogurt',
  'Spinach',
]

type SmartInputMode = null | 'photo' | 'barcode' | 'receipt' | 'review'

// Helper to map detected items to review items
function mapToReviewItem(item: DetectedItem | ReceiptItem, index: number): ReviewItem {
  const category = (item.category as FoodCategory) || 'other'
  const storageLocation = getDefaultStorageLocation(item.name, category)
  return {
    id: `detected-${index}`,
    name: item.name,
    category,
    quantity: item.quantity,
    quantityUnit: (item.quantityUnit as QuantityUnit) || 'count',
    storageLocation,
    expirationDate: estimateExpirationDate(item.name, category, storageLocation),
    brand: 'brand' in item ? item.brand : undefined,
    selected: true,
  }
}

export function AddItemPage() {
  const navigate = useNavigate()
  // On /item/:id/edit this page edits an existing item instead of adding one
  const { id } = useParams<{ id: string }>()
  const isEditing = id !== undefined
  const { addItem, updateItem, inventory } = useDemoStore()
  const editingItem = isEditing ? inventory.find((i) => i.id === id) : undefined
  const [loading, setLoading] = useState(false)

  // Smart input state
  const [smartInputMode, setSmartInputMode] = useState<SmartInputMode>(null)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [processingImage, setProcessingImage] = useState(false)

  // Form state
  const [name, setName] = useState(editingItem?.name ?? '')
  const [brand, setBrand] = useState(editingItem?.brand ?? '')
  // Kept as text so values like "0.5" can be typed
  const [quantity, setQuantity] = useState(String(editingItem?.quantity ?? 1))
  const [unit, setUnit] = useState<QuantityUnit>(editingItem?.quantityUnit ?? 'count')
  const [category, setCategory] = useState<FoodCategory>(editingItem?.category ?? 'other')
  const [storageLocation, setStorageLocation] = useState<StorageLocation>(editingItem?.storageLocation ?? 'refrigerator')
  const [purchaseDate, setPurchaseDate] = useState(editingItem?.purchaseDate ?? todayDateString())
  const [expirationDate, setExpirationDate] = useState(
    editingItem?.expirationDate ?? estimateExpirationDate('', 'other', 'refrigerator')
  )
  const [isEstimated, setIsEstimated] = useState(editingItem ? editingItem.expirationSource === 'calculated' : true)

  const quantityValue = Number(quantity)
  const isValid = name.trim() !== '' && quantityValue > 0 && purchaseDate !== '' && expirationDate !== ''

  // Get food icon for current name
  const FoodIcon = getFoodIcon(name)

  // Autofill when name changes (not when editing: fixing a typo in the name
  // shouldn't reset the item's quantity and dates)
  useEffect(() => {
    if (isEditing || !name.trim()) return

    const match = lookupFood(name)
    if (match) {
      setCategory(match.category)
      setUnit(match.unit)
      setQuantity(String(match.defaultQty))
      setStorageLocation(match.storage)
      setExpirationDate(estimateExpirationDate(name, match.category, match.storage, purchaseDate))
      setIsEstimated(true)
    }
    // Only re-run on name changes; purchaseDate is read for the estimate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isEditing])

  // Keep an estimated expiration in step with category, location and purchase date
  const updateEstimate = (updates: {
    name?: string
    category?: FoodCategory
    storageLocation?: StorageLocation
    purchaseDate?: string
  }) => {
    if (!isEstimated) return
    setExpirationDate(estimateExpirationDate(
      updates.name ?? name,
      updates.category ?? category,
      updates.storageLocation ?? storageLocation,
      updates.purchaseDate ?? purchaseDate
    ))
  }

  // Personalized quick adds based on frequently added items
  const personalizedQuickAdds = useMemo(() => {
    const itemCounts: Record<string, number> = {}
    inventory.forEach((item) => {
      const normalizedName = item.name.toLowerCase()
      itemCounts[normalizedName] = (itemCounts[normalizedName] || 0) + 1
    })

    const frequent = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1))

    const combined = [...new Set([...frequent, ...QUICK_ADD_ITEMS])]
    return combined.slice(0, 8)
  }, [inventory])

  const handleQuickAdd = (itemName: string) => {
    setName(itemName)
  }

  const handleSubmit = async () => {
    if (!isValid) return

    setLoading(true)

    const freshnessScore = calculateFreshnessScore(purchaseDate, expirationDate)

    if (editingItem) {
      const expirationChanged = expirationDate !== editingItem.expirationDate
      updateItem(editingItem.id, {
        name: name.trim(),
        brand: brand.trim() || undefined,
        category,
        quantity: quantityValue,
        quantityUnit: unit,
        // A new unit makes the old starting amount meaningless; more than the
        // starting amount means more was bought than first recorded
        originalQuantity: unit !== editingItem.quantityUnit
          ? quantityValue
          : Math.max(editingItem.originalQuantity, quantityValue),
        storageLocation,
        purchaseDate,
        expirationDate,
        expirationSource: expirationChanged
          ? (isEstimated ? 'calculated' : 'manual')
          : editingItem.expirationSource,
        freshnessScore,
      })

      setLoading(false)
      navigate(-1)
      return
    }

    addItem({
      householdId: DEMO_HOUSEHOLD.id,
      name: name.trim(),
      brand: brand.trim() || undefined,
      category,
      quantity: quantityValue,
      quantityUnit: unit,
      originalQuantity: quantityValue,
      storageLocation,
      purchaseDate,
      expirationDate,
      expirationSource: isEstimated ? 'calculated' : 'manual',
      freshnessScore,
      tags: [],
      addedBy: DEMO_USER.id,
      addedVia: 'manual',
      status: 'active',
    })

    setLoading(false)
    navigate('/')
  }

  // Handle photo capture for grocery detection
  const handlePhotoCapture = async (imageBase64: string) => {
    setProcessingImage(true)
    setSmartInputMode(null)

    try {
      const result = await processGroceryImage(imageBase64)
      if (result.success && result.items.length > 0) {
        setReviewItems(result.items.map(mapToReviewItem))
        setSmartInputMode('review')
      } else {
        alert(result.error || 'No items detected in the image')
      }
    } catch (err) {
      console.error('Photo processing error:', err)
      alert('Failed to process image')
    } finally {
      setProcessingImage(false)
    }
  }

  // Handle receipt capture
  const handleReceiptCapture = async (imageBase64: string) => {
    setProcessingImage(true)
    setSmartInputMode(null)

    try {
      const result = await processReceipt(imageBase64)
      if (result.success && result.items.length > 0) {
        setReviewItems(result.items.map(mapToReviewItem))
        setSmartInputMode('review')
      } else {
        alert(result.error || 'No items detected in the receipt')
      }
    } catch (err) {
      console.error('Receipt processing error:', err)
      alert('Failed to process receipt')
    } finally {
      setProcessingImage(false)
    }
  }

  // Handle barcode scan
  const handleBarcodeScan = (product: BarcodeProduct) => {
    setSmartInputMode(null)
    setName(product.name)
    if (product.brand) setBrand(product.brand)
    const productCategory = (product.category as FoodCategory) || 'other'
    const productStorage = getDefaultStorageLocation(product.name, productCategory)
    setCategory(productCategory)
    setStorageLocation(productStorage)
    updateEstimate({ name: product.name, category: productCategory, storageLocation: productStorage })
  }

  // Handle adding reviewed items
  const handleAddReviewedItems = async (items: ReviewItem[]) => {
    setLoading(true)

    const today = todayDateString()

    for (const item of items) {
      const itemExpirationDate = item.expirationDate ||
        estimateExpirationDate(item.name, item.category, item.storageLocation)

      addItem({
        householdId: DEMO_HOUSEHOLD.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        quantityUnit: item.quantityUnit,
        originalQuantity: item.quantity,
        storageLocation: item.storageLocation,
        brand: item.brand,
        purchaseDate: today,
        expirationDate: itemExpirationDate,
        expirationSource: item.expirationEdited ? 'manual' : 'calculated',
        freshnessScore: calculateFreshnessScore(today, itemExpirationDate),
        tags: [],
        addedBy: DEMO_USER.id,
        addedVia: 'photo',
        status: 'active',
      })
    }

    setLoading(false)
    setSmartInputMode(null)
    navigate('/')
  }

  if (isEditing && !editingItem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Item not found</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    )
  }

  // Smart input modals
  if (smartInputMode === 'photo') {
    return (
      <PhotoCapture
        onCapture={handlePhotoCapture}
        onCancel={() => setSmartInputMode(null)}
        title="Scan Groceries"
      />
    )
  }

  if (smartInputMode === 'receipt') {
    return (
      <PhotoCapture
        onCapture={handleReceiptCapture}
        onCancel={() => setSmartInputMode(null)}
        title="Scan Receipt"
      />
    )
  }

  if (smartInputMode === 'barcode') {
    return (
      <BarcodeScanner
        onScan={handleBarcodeScan}
        onCancel={() => setSmartInputMode(null)}
      />
    )
  }

  if (smartInputMode === 'review') {
    return (
      <ItemReviewList
        items={reviewItems}
        onItemsChange={setReviewItems}
        onConfirm={handleAddReviewedItems}
        onCancel={() => setSmartInputMode(null)}
        loading={loading}
      />
    )
  }

  // Processing overlay
  if (processingImage) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p>Analyzing image...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Responsive container */}
      <div className="max-w-lg mx-auto flex flex-col flex-1 w-full">
        {/* Header */}
        <header className="bg-white px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">{isEditing ? 'Edit Item' : 'Add Item'}</h1>
          <button className="p-2 text-gray-500 hover:text-gray-700">
            <MoreVertical className="h-5 w-5" />
          </button>
        </header>

        {/* Smart Input Buttons */}
        {!isEditing && (
          <div className="bg-white border-b border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500 mb-2">Quick add with</p>
            <div className="flex gap-2">
              <button
                onClick={() => setSmartInputMode('photo')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors"
              >
                <Camera className="h-5 w-5" />
                <span className="font-medium">Photo</span>
              </button>
              <button
                onClick={() => setSmartInputMode('barcode')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <Barcode className="h-5 w-5" />
                <span className="font-medium">Barcode</span>
              </button>
              <button
                onClick={() => setSmartInputMode('receipt')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors"
              >
                <Receipt className="h-5 w-5" />
                <span className="font-medium">Receipt</span>
              </button>
            </div>
          </div>
        )}

        {/* Food Icon Preview */}
        <div className="bg-gray-100 py-6 flex items-center justify-center">
          <div className="w-20 h-20 flex items-center justify-center">
            <FoodIcon size={72} />
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-t-3xl -mt-2 px-4 pt-6 pb-32 flex-1">
          <div className="space-y-4">
            {/* Quick Add Chips */}
            {!isEditing && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Quick add</p>
                <div className="flex flex-wrap gap-2">
                  {personalizedQuickAdds.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleQuickAdd(item)}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-100 transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name of Item <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g. Chicken Breast"
              />
            </div>

            {/* Brand Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Optional"
              />
            </div>

            {/* Quantity and Unit */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Qty <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0.01"
                  step="any"
                  inputMode="decimal"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as QuantityUnit)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  >
                    {Object.entries(QUANTITY_UNITS).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => {
                    const newCategory = e.target.value as FoodCategory
                    setCategory(newCategory)
                    updateEstimate({ category: newCategory })
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                >
                  {Object.entries(CATEGORIES).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Storage Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={storageLocation}
                  onChange={(e) => {
                    const newLocation = e.target.value as StorageLocation
                    setStorageLocation(newLocation)
                    updateEstimate({ storageLocation: newLocation })
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                >
                  {Object.entries(STORAGE_LOCATIONS).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => {
                  setPurchaseDate(e.target.value)
                  if (e.target.value) updateEstimate({ purchaseDate: e.target.value })
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              />
            </div>

            {/* Expiration Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => {
                  setExpirationDate(e.target.value)
                  setIsEstimated(false)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              />
              {isEstimated && (
                <p className="text-xs text-gray-500 mt-1">Estimated based on item type and storage</p>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Action Buttons */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
              disabled={!isValid}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
