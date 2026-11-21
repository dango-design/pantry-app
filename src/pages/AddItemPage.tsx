import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronDown, Camera, Barcode, Receipt, Loader2, ShieldX } from 'lucide-react'
import { Button } from '@/components/common'
import { PhotoCapture, BarcodeScanner, ItemReviewList, type ReviewItem } from '@/components/smart-input'
import { useDemoStore, DEMO_HOUSEHOLD, DEMO_USER } from '@/stores/demoStore'
import { CATEGORIES, QUANTITY_UNITS, STORAGE_LOCATIONS } from '@/utils/constants'
import { dateStringFromToday, todayDateString } from '@/utils/dates'
import { calculateFreshnessScore } from '@/utils/freshness'
import { getDefaultStorageLocation } from '@/utils/foodDatabase'
import { describeExpiry, estimateExpiry, guessItem, parseCategory, type ExpiryEstimate } from '@/utils/itemDefaults'
import { getProductMemory, type ProductMemory } from '@/utils/stock'
import { parseUnit } from '@/utils/units'
import { FoodThumbnail } from '@/components/icons'
import { PAGE_WIDTHS, PageHeader } from '@/components/layout'
import { cn } from '@/utils/cn'
import {
  processGroceryImage,
  processReceipt,
  type DetectedItem,
  type ReceiptItem,
  type BarcodeProduct,
} from '@/services'
import type { FoodCategory, StorageLocation, QuantityUnit } from '@/types'
import type { LookupResult } from '@/allergy/lookup'
import { productName } from '@/allergy/products'
import { recordsForGtin, useAllergyStore } from '@/allergy/store'
import { LazyAddItemAllergyCheck } from '@/components/allergy/lazy'
import { categoryFromLabels } from '@/utils/productCategory'

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

// A photo or receipt item as a review row. A product bought before gets what
// was saved last time. Otherwise the food table's category wins over the
// scan's, so a name is filed the same way however it is added. The scan's
// category is used for names the table does not know.
function toDetectedReviewItem(
  item: DetectedItem | ReceiptItem,
  index: number,
  memory: ProductMemory[],
  purchaseDate: string,
): ReviewItem {
  const guess = guessItem(item.name, memory)
  const scanned = parseCategory(item.category)
  const category = guess.source === 'none' && scanned ? scanned : guess.category
  const storageLocation = guess.source === 'none' ? getDefaultStorageLocation(item.name, category) : guess.storageLocation
  return {
    id: `detected-${index}`,
    name: item.name,
    category,
    quantity: item.quantity > 0 ? item.quantity : guess.quantity,
    quantityUnit: parseUnit(item.quantityUnit),
    storageLocation,
    brand: ('brand' in item ? item.brand : undefined) ?? guess.brand,
    purchaseDate,
    expirationDate: estimateExpiry(item.name, category, storageLocation, purchaseDate, memory).date,
    selected: true,
  }
}

// The receipt's date when it reads as a day in the last month. A date in the
// future or long ago is more likely misread than real.
function receiptPurchaseDate(date: string | undefined): string {
  const today = todayDateString()
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return today
  return date <= today && date >= dateStringFromToday(-30) ? date : today
}

// Form fields the user can set by hand. Once set, guessing from the name leaves them alone.
type GuessedField = 'category' | 'storage' | 'unit' | 'quantity' | 'brand'

export function AddItemPage() {
  const navigate = useNavigate()
  const location = useLocation()
  // On /item/:id/edit this page edits an existing item instead of adding one
  const { id } = useParams<{ id: string }>()
  const isEditing = id !== undefined
  const { addItem, updateItem, inventory, staples } = useDemoStore()
  const editingItem = isEditing ? inventory.find((i) => i.id === id) : undefined
  // What the household bought before: a known name gets what was saved last time
  const memory = useMemo(() => getProductMemory(inventory, staples), [inventory, staples])
  // For the barcode fill, which must not run again when the pantry changes
  const memoryRef = useRef(memory)
  useEffect(() => {
    memoryRef.current = memory
  }, [memory])
  const [loading, setLoading] = useState(false)

  // Smart input state. /add?mode=barcode (or photo, receipt) opens that scanner
  // straight away, e.g. from the Add sheet's shortcuts.
  const [searchParams] = useSearchParams()
  const [smartInputMode, setSmartInputMode] = useState<SmartInputMode>(() => {
    const mode = searchParams.get('mode')
    return !isEditing && (mode === 'photo' || mode === 'barcode' || mode === 'receipt') ? mode : null
  })
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
  // How the current estimate was made, for the note under the date. Not known for an item being edited until something changes.
  const [estimate, setEstimate] = useState<ExpiryEstimate | null>(() =>
    editingItem ? null : estimateExpiry('', 'other', 'refrigerator', todayDateString())
  )
  const [expirationDate, setExpirationDate] = useState(editingItem?.expirationDate ?? estimate?.date ?? '')
  const [isEstimated, setIsEstimated] = useState(editingItem ? editingItem.expirationSource === 'calculated' : true)
  const touched = useRef(new Set<GuessedField>())

  // Barcode and allergy state. scannedGtin is set when a new item comes from a barcode.
  const [scannedGtin, setScannedGtin] = useState<string | null>(null)
  const [redPeople, setRedPeople] = useState<{ name: string; reason: string }[]>([])
  const [confirmedRed, setConfirmedRed] = useState(false)
  // The name a barcode filled in. The name autofill leaves it alone: the product's own category
  // labels already chose its category, which is better than a guess from the words in its name.
  const barcodeName = useRef<string | null>(null)

  const quantityValue = Number(quantity)
  const isValid = name.trim() !== '' && quantityValue > 0 && purchaseDate !== '' && expirationDate !== ''

  // Keep an estimated expiration in step with name, category, location and purchase date
  const updateEstimate = (updates: {
    name?: string
    category?: FoodCategory
    storageLocation?: StorageLocation
    purchaseDate?: string
  }) => {
    if (!isEstimated) return
    const next = estimateExpiry(
      updates.name ?? name,
      updates.category ?? category,
      updates.storageLocation ?? storageLocation,
      updates.purchaseDate ?? purchaseDate,
      memory
    )
    setExpirationDate(next.date)
    setEstimate(next)
  }

  // Fill in the rest of the form when the name changes, from the household's
  // last purchase or the food table. Fields the user set by hand stay as they
  // are. Not when editing: fixing a typo in the name shouldn't reset the
  // item's quantity and dates.
  useEffect(() => {
    if (isEditing || !name.trim()) return
    if (name === barcodeName.current) return

    const guess = guessItem(name, memory)
    const keep = touched.current
    const nextCategory = keep.has('category') ? category : guess.category
    const nextLocation = keep.has('storage')
      ? storageLocation
      : keep.has('category') ? getDefaultStorageLocation(name, nextCategory) : guess.storageLocation

    setCategory(nextCategory)
    setStorageLocation(nextLocation)
    if (!keep.has('unit')) setUnit(guess.unit)
    if (!keep.has('quantity')) setQuantity(String(guess.quantity))
    if (!keep.has('brand')) setBrand(guess.brand ?? '')
    updateEstimate({ name, category: nextCategory, storageLocation: nextLocation })
    // Only re-run on name changes; the other fields are read for the guess
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isEditing])

  // Fill the form from a barcode lookup. A product bought before gets what was saved last time.
  // Otherwise the category comes from the product's category labels, then from its name. Storage and
  // expiry use the food table only when the name names a food of that category.
  const fillFromBarcode = useCallback((gtin: string, records: LookupResult['records']) => {
    setScannedGtin(gtin)
    setConfirmedRed(false)
    if (records.length === 0) return
    const { name: productTitle, brand: productBrand } = productName(records)
    const history = memoryRef.current
    const guess = guessItem(productTitle, history)
    const labelled = records.map((record) => categoryFromLabels(record.categories)).find((found) => found !== undefined)
    const productCategory = guess.source === 'history'
      ? guess.category
      : labelled ?? (guess.source === 'food' ? guess.category : 'pantry')
    const productStorage = guess.source === 'history'
      ? guess.storageLocation
      : getDefaultStorageLocation(productTitle, productCategory)
    const productEstimate = estimateExpiry(productTitle, productCategory, productStorage, todayDateString(), history)

    barcodeName.current = productTitle
    // These come from the product, so editing its name keeps them
    touched.current = new Set(['category', 'storage', 'brand'])
    setName(productTitle)
    setBrand(productBrand ?? guess.brand ?? '')
    setCategory(productCategory)
    setStorageLocation(productStorage)
    setIsEstimated(true)
    setExpirationDate(productEstimate.date)
    setEstimate(productEstimate)
  }, [])

  // Arriving from the Check page with "Add to pantry": fill in what the barcode lookup found.
  const fromCheck = isEditing ? undefined : (location.state as { gtin?: string } | null)?.gtin
  useEffect(() => {
    if (!fromCheck) return
    fillFromBarcode(fromCheck, recordsForGtin(useAllergyStore.getState().products, fromCheck))
  }, [fromCheck, fillFromBarcode])

  const handleRedPeople = useCallback((people: { name: string; reason: string }[]) => {
    setRedPeople(people)
    setConfirmedRed(false)
  }, [])

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

    // Not safe for someone: say who and why, and ask for a second tap. Don't block it.
    if (!isEditing && scannedGtin && redPeople.length > 0 && !confirmedRed) {
      setConfirmedRed(true)
      return
    }

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
      addedVia: scannedGtin ? 'barcode' : 'manual',
      ...(scannedGtin ? { gtin: scannedGtin, barcode: scannedGtin } : {}),
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
        const today = todayDateString()
        setReviewItems(result.items.map((item, index) => toDetectedReviewItem(item, index, memory, today)))
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
        const purchased = receiptPurchaseDate(result.date)
        setReviewItems(result.items.map((item, index) => toDetectedReviewItem(item, index, memory, purchased)))
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

  // Handle barcode scan. The lookup has already cached the product for the allergy check.
  const handleBarcodeScan = (_product: BarcodeProduct, lookup: LookupResult) => {
    setSmartInputMode(null)
    fillFromBarcode(lookup.gtin, lookup.records)
  }

  // Handle adding reviewed items
  const handleAddReviewedItems = async (items: ReviewItem[]) => {
    setLoading(true)

    const today = todayDateString()

    for (const item of items) {
      const itemPurchaseDate = item.purchaseDate ?? today
      const itemExpirationDate = item.expirationDate ||
        estimateExpiry(item.name, item.category, item.storageLocation, itemPurchaseDate, memory).date

      addItem({
        householdId: DEMO_HOUSEHOLD.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        quantityUnit: item.quantityUnit,
        originalQuantity: item.quantity,
        storageLocation: item.storageLocation,
        brand: item.brand,
        purchaseDate: itemPurchaseDate,
        expirationDate: itemExpirationDate,
        expirationSource: item.expirationEdited ? 'manual' : 'calculated',
        freshnessScore: calculateFreshnessScore(itemPurchaseDate, itemExpirationDate),
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
          <Button onClick={() => navigate('/')}>Go home</Button>
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
        title="Scan groceries"
      />
    )
  }

  if (smartInputMode === 'receipt') {
    return (
      <PhotoCapture
        onCapture={handleReceiptCapture}
        onCancel={() => setSmartInputMode(null)}
        title="Scan receipt"
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
        memory={memory}
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
    <div className="min-h-screen bg-gray-100 md:bg-gray-50 flex flex-col">
      <PageHeader title={isEditing ? 'Edit item' : 'Add item'} />

      {/* Phones: the form fills the screen. Wider screens: a card, with its buttons at the end. */}
      <div className={cn('mx-auto w-full flex flex-col flex-1 md:flex-none md:my-6 md:rounded-2xl md:border md:border-gray-200 md:overflow-hidden md:bg-white', PAGE_WIDTHS.narrow)}>

        {/* Smart Input Buttons */}
        {!isEditing && (
          <div className="bg-white border-b border-gray-100 px-4 py-3 md:px-6 md:pt-6 md:pb-4">
            <p className="text-xs text-gray-500 mb-2">Quick add with</p>
            <div className="flex gap-2">
              <button
                onClick={() => setSmartInputMode('photo')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-soft text-primary rounded-xl hover:bg-primary-muted transition-colors"
              >
                <Camera className="h-5 w-5" />
                <span className="font-medium">Photo</span>
              </button>
              <button
                onClick={() => setSmartInputMode('barcode')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-soft text-primary rounded-xl hover:bg-primary-muted transition-colors"
              >
                <Barcode className="h-5 w-5" />
                <span className="font-medium">Barcode</span>
              </button>
              <button
                onClick={() => setSmartInputMode('receipt')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-soft text-primary rounded-xl hover:bg-primary-muted transition-colors"
              >
                <Receipt className="h-5 w-5" />
                <span className="font-medium">Receipt</span>
              </button>
            </div>
          </div>
        )}

        {/* Food Icon Preview: on phones the form below overlaps this band like a sheet */}
        <div className="bg-gray-100 py-6 flex items-center justify-center md:bg-white md:pb-2">
          <FoodThumbnail name={name} category={category} iconSize={36} className="w-20 h-20 rounded-2xl" />
        </div>

        {/* Form */}
        <div className="bg-white rounded-t-3xl -mt-2 px-4 pt-6 pb-32 flex-1 md:rounded-none md:mt-0 md:px-6 md:pb-6">
          <div className="space-y-4">
            {/* Allergy check for a scanned product, before saving */}
            {!isEditing && scannedGtin && (
              <Suspense fallback={null}>
                <LazyAddItemAllergyCheck gtin={scannedGtin} onRedPeople={handleRedPeople} />
              </Suspense>
            )}

            {/* Quick Add Chips */}
            {!isEditing && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Quick add</p>
                <div className="flex flex-wrap gap-2">
                  {personalizedQuickAdds.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleQuickAdd(item)}
                      className="px-3 py-1.5 bg-primary-soft text-primary rounded-full text-sm font-medium hover:bg-primary-muted transition-colors"
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
                Name of item <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                onChange={(e) => {
                  touched.current.add('brand')
                  setBrand(e.target.value)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  onChange={(e) => {
                    touched.current.add('quantity')
                    setQuantity(e.target.value)
                  }}
                  min="0.01"
                  step="any"
                  inputMode="decimal"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={unit}
                    onChange={(e) => {
                      touched.current.add('unit')
                      setUnit(e.target.value as QuantityUnit)
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
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
                    touched.current.add('category')
                    setCategory(newCategory)
                    // Frozen goes in the freezer, unless the user already picked a place
                    const newLocation = touched.current.has('storage')
                      ? storageLocation
                      : getDefaultStorageLocation(name, newCategory)
                    setStorageLocation(newLocation)
                    updateEstimate({ category: newCategory, storageLocation: newLocation })
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
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
                    touched.current.add('storage')
                    setStorageLocation(newLocation)
                    updateEstimate({ storageLocation: newLocation })
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base appearance-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
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

            {/* Purchase date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => {
                  setPurchaseDate(e.target.value)
                  if (e.target.value) updateEstimate({ purchaseDate: e.target.value })
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              />
            </div>

            {/* Expiration date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => {
                  setExpirationDate(e.target.value)
                  setIsEstimated(false)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              />
              {isEstimated && (
                <p className="text-xs text-gray-500 mt-1">
                  {estimate ? describeExpiry(estimate) : 'Estimated based on item type and storage'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Phones: a bar fixed along the bottom. Wider screens: the end of the form card. */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:static md:px-6"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {confirmedRed && redPeople.length > 0 && (
            <div role="alert" className="max-w-lg mx-auto mb-3 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 md:max-w-none">
              <ShieldX aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                {redPeople.map((p) => (
                  <p key={p.name}>
                    <span className="font-semibold">Not safe for {p.name}:</span> {p.reason}
                  </p>
                ))}
                <p className="mt-1">Tap "Add anyway" to add it to the pantry.</p>
              </div>
            </div>
          )}
          <div className="flex gap-3 max-w-lg mx-auto md:max-w-none md:justify-end">
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              className="flex-1 md:flex-none md:min-w-28"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
              disabled={!isValid}
              className={cn(
                'flex-1 md:flex-none md:min-w-28',
                confirmedRed ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-primary hover:bg-primary-hover'
              )}
            >
              {confirmedRed ? 'Add anyway' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
