import { supabase, isDemoMode } from './supabase'

interface DetectedItem {
  name: string
  category: string
  quantity: number
  quantityUnit: string
  brand?: string
  confidence: number
}

interface ReceiptItem {
  name: string
  category: string
  quantity: number
  quantityUnit: string
  price?: number
  confidence: number
}

interface BarcodeProduct {
  name: string
  brand: string | null
  category: string
  quantity: string | null
  imageUrl: string | null
  barcode: string
}

interface ProcessImageResult {
  success: boolean
  items: DetectedItem[]
  error?: string
}

interface ProcessReceiptResult {
  success: boolean
  storeName?: string
  date?: string
  items: ReceiptItem[]
  total?: number
  error?: string
}

interface BarcodeLookupResult {
  success: boolean
  product?: BarcodeProduct
  error?: string
}

const DEMO_MODE_ERROR = 'AI features require Supabase to be configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file and deploy the Edge Functions.'

/**
 * Process a grocery photo to detect food items
 */
export async function processGroceryImage(
  imageBase64: string
): Promise<ProcessImageResult> {
  if (isDemoMode) {
    return { success: false, items: [], error: DEMO_MODE_ERROR }
  }

  const { data, error } = await supabase.functions.invoke('process-image', {
    body: { imageBase64 },
  })

  if (error) {
    console.error('Process image error:', error)
    return { success: false, items: [], error: error.message }
  }

  return data as ProcessImageResult
}

/**
 * Process a grocery photo from URL to detect food items
 */
export async function processGroceryImageUrl(
  imageUrl: string
): Promise<ProcessImageResult> {
  if (isDemoMode) {
    return { success: false, items: [], error: DEMO_MODE_ERROR }
  }

  const { data, error } = await supabase.functions.invoke('process-image', {
    body: { imageUrl },
  })

  if (error) {
    console.error('Process image error:', error)
    return { success: false, items: [], error: error.message }
  }

  return data as ProcessImageResult
}

/**
 * Process a receipt image to extract purchased items
 */
export async function processReceipt(
  imageBase64: string
): Promise<ProcessReceiptResult> {
  if (isDemoMode) {
    return { success: false, items: [], error: DEMO_MODE_ERROR }
  }

  const { data, error } = await supabase.functions.invoke('process-receipt', {
    body: { imageBase64 },
  })

  if (error) {
    console.error('Process receipt error:', error)
    return { success: false, items: [], error: error.message }
  }

  return data as ProcessReceiptResult
}

/**
 * Process a receipt image from URL
 */
export async function processReceiptUrl(
  imageUrl: string
): Promise<ProcessReceiptResult> {
  if (isDemoMode) {
    return { success: false, items: [], error: DEMO_MODE_ERROR }
  }

  const { data, error } = await supabase.functions.invoke('process-receipt', {
    body: { imageUrl },
  })

  if (error) {
    console.error('Process receipt error:', error)
    return { success: false, items: [], error: error.message }
  }

  return data as ProcessReceiptResult
}

/**
 * Look up a product by barcode
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
  if (isDemoMode) {
    return { success: false, error: DEMO_MODE_ERROR }
  }

  const { data, error } = await supabase.functions.invoke('barcode-lookup', {
    body: { barcode },
  })

  if (error) {
    console.error('Barcode lookup error:', error)
    return { success: false, error: error.message }
  }

  return data as BarcodeLookupResult
}

/**
 * Convert a File to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export type {
  DetectedItem,
  ReceiptItem,
  BarcodeProduct,
  ProcessImageResult,
  ProcessReceiptResult,
  BarcodeLookupResult,
}
