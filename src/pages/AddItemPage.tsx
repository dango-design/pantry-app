import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, ChevronDown, Camera, Barcode, Receipt, Loader2 } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { Button } from '@/components/common'
import { PhotoCapture, BarcodeScanner, ItemReviewList, type ReviewItem } from '@/components/smart-input'
import { useDemoStore, DEMO_HOUSEHOLD, DEMO_USER } from '@/stores/demoStore'
import { CATEGORIES, QUANTITY_UNITS, STORAGE_LOCATIONS } from '@/utils/constants'
import { getFoodIcon } from '@/components/icons'
import {
  processGroceryImage,
  processReceipt,
  type DetectedItem,
  type ReceiptItem,
  type BarcodeProduct,
} from '@/services'
import type { FoodCategory, StorageLocation, QuantityUnit } from '@/types'

// Food item database for autofill
const FOOD_DATABASE: Record<string, {
  category: FoodCategory
  unit: QuantityUnit
  defaultQty: number
  storage: StorageLocation
  expirationDays: number
}> = {
  'almond milk': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 7 },
  'milk': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 7 },
  'banana': { category: 'produce', unit: 'count', defaultQty: 1, storage: 'counter', expirationDays: 5 },
  'bananas': { category: 'produce', unit: 'count', defaultQty: 6, storage: 'counter', expirationDays: 5 },
  'apple': { category: 'produce', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 14 },
  'apples': { category: 'produce', unit: 'count', defaultQty: 6, storage: 'refrigerator', expirationDays: 14 },
  'honeycrisp apple': { category: 'produce', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 14 },
  'chicken thighs': { category: 'meat', unit: 'lb', defaultQty: 1, storage: 'refrigerator', expirationDays: 2 },
  'chicken breast': { category: 'meat', unit: 'lb', defaultQty: 1, storage: 'refrigerator', expirationDays: 2 },
  'ground beef': { category: 'meat', unit: 'lb', defaultQty: 1, storage: 'freezer', expirationDays: 120 },
  'eggs': { category: 'dairy', unit: 'count', defaultQty: 12, storage: 'refrigerator', expirationDays: 21 },
  'bread': { category: 'bakery', unit: 'count', defaultQty: 1, storage: 'counter', expirationDays: 5 },
  'cheese': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 30 },
  'cheddar cheese': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 30 },
  'yogurt': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 14 },
  'greek yogurt': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 14 },
  'spinach': { category: 'produce', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 5 },
  'pasta': { category: 'pantry', unit: 'count', defaultQty: 1, storage: 'pantry', expirationDays: 365 },
  'spaghetti': { category: 'pantry', unit: 'count', defaultQty: 1, storage: 'pantry', expirationDays: 365 },
  'rice': { category: 'pantry', unit: 'lb', defaultQty: 2, storage: 'pantry', expirationDays: 365 },
  'olive oil': { category: 'condiments', unit: 'count', defaultQty: 1, storage: 'pantry', expirationDays: 180 },
  'butter': { category: 'dairy', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 30 },
  'pork gyoza': { category: 'frozen', unit: 'count', defaultQty: 1, storage: 'freezer', expirationDays: 90 },
  'avocado': { category: 'produce', unit: 'count', defaultQty: 1, storage: 'counter', expirationDays: 4 },
  'avocados': { category: 'produce', unit: 'count', defaultQty: 3, storage: 'counter', expirationDays: 4 },
  'tomatoes': { category: 'produce', unit: 'count', defaultQty: 4, storage: 'counter', expirationDays: 7 },
  'salsa': { category: 'condiments', unit: 'count', defaultQty: 1, storage: 'refrigerator', expirationDays: 30 },
}

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
  return {
    id: `detected-${index}`,
    name: item.name,
    category: (item.category as FoodCategory) || 'other',
    quantity: item.quantity,
    quantityUnit: (item.quantityUnit as QuantityUnit) || 'count',
    storageLocation: 'refrigerator', // Default, will be updated based on category
    brand: 'brand' in item ? item.brand : undefined,
    selected: true,
  }
}

// Map category to default storage location
function getDefaultStorage(category: FoodCategory): StorageLocation {
  switch (category) {
    case 'produce':
      return 'refrigerator'
    case 'dairy':
      return 'refrigerator'
    case 'meat':
    case 'seafood':
      return 'refrigerator'
    case 'frozen':
      return 'freezer'
    case 'bakery':
      return 'counter'
    case 'beverages':
      return 'refrigerator'
    case 'condiments':
      return 'refrigerator'
    case 'snacks':
    case 'pantry':
      return 'pantry'
    default:
      return 'refrigerator'
  }
}

export function AddItemPage() {
  const navigate = useNavigate()
  const { addItem, inventory } = useDemoStore()
  const [loading, setLoading] = useState(false)

  // Smart input state
  const [smartInputMode, setSmartInputMode] = useState<SmartInputMode>(null)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [processingImage, setProcessingImage] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState<QuantityUnit>('count')
  const [category, setCategory] = useState<FoodCategory>('other')
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('refrigerator')
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [expirationDate, setExpirationDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
  const [isEstimated, setIsEstimated] = useState(true)

  // Get food icon for current name
  const FoodIcon = getFoodIcon(name)

  // Autofill when name changes
  useEffect(() => {
    if (!name.trim()) return

    const normalizedName = name.toLowerCase().trim()
    const match = FOOD_DATABASE[normalizedName]

    if (match) {
      setCategory(match.category)
      setUnit(match.unit)
      setQuantity(match.defaultQty)
      setStorageLocation(match.storage)
      setExpirationDate(format(addDays(new Date(), match.expirationDays), 'yyyy-MM-dd'))
      setIsEstimated(true)
    } else {
      // Try partial match
      for (const [key, data] of Object.entries(FOOD_DATABASE)) {
        if (normalizedName.includes(key) || key.includes(normalizedName)) {
          setCategory(data.category)
          setUnit(data.unit)
          setQuantity(data.defaultQty)
          setStorageLocation(data.storage)
          setExpirationDate(format(addDays(new Date(), data.expirationDays), 'yyyy-MM-dd'))
          setIsEstimated(true)
          break
        }
      }
    }
  }, [name])

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
    if (!name.trim()) return

    setLoading(true)

    const freshnessScore = 100

    addItem({
      householdId: DEMO_HOUSEHOLD.id,
      name: name.trim(),
      category,
      quantity,
      quantityUnit: unit,
      originalQuantity: quantity,
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
        const items = result.items.map((item, index) => {
          const reviewItem = mapToReviewItem(item, index)
          reviewItem.storageLocation = getDefaultStorage(reviewItem.category)
          return reviewItem
        })
        setReviewItems(items)
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
        const items = result.items.map((item, index) => {
          const reviewItem = mapToReviewItem(item, index)
          reviewItem.storageLocation = getDefaultStorage(reviewItem.category)
          return reviewItem
        })
        setReviewItems(items)
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
    setCategory((product.category as FoodCategory) || 'other')
    setStorageLocation(getDefaultStorage((product.category as FoodCategory) || 'other'))
  }

  // Handle adding reviewed items
  const handleAddReviewedItems = async (items: ReviewItem[]) => {
    setLoading(true)

    for (const item of items) {
      const expirationDays = FOOD_DATABASE[item.name.toLowerCase()]?.expirationDays || 14

      addItem({
        householdId: DEMO_HOUSEHOLD.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        quantityUnit: item.quantityUnit,
        originalQuantity: item.quantity,
        storageLocation: item.storageLocation,
        purchaseDate: format(new Date(), 'yyyy-MM-dd'),
        expirationDate: format(addDays(new Date(), expirationDays), 'yyyy-MM-dd'),
        expirationSource: 'calculated',
        freshnessScore: 100,
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
          <h1 className="text-lg font-semibold text-gray-900">Add Item</h1>
          <button className="p-2 text-gray-500 hover:text-gray-700">
            <MoreVertical className="h-5 w-5" />
          </button>
        </header>

        {/* Smart Input Buttons */}
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
                  onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                  min="0.01"
                  step="0.01"
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
                  onChange={(e) => setCategory(e.target.value as FoodCategory)}
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
                  onChange={(e) => setStorageLocation(e.target.value as StorageLocation)}
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
                onChange={(e) => setPurchaseDate(e.target.value)}
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
                <p className="text-xs text-gray-500 mt-1">Estimated based on item type</p>
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
              disabled={!name.trim()}
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
