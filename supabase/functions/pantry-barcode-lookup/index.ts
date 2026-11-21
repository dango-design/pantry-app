import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OpenFoodFactsProduct {
  product_name?: string
  brands?: string
  categories?: string
  quantity?: string
  image_url?: string
  nutriscore_grade?: string
  ingredients_text?: string
}

interface BarcodeResponse {
  success: boolean
  product?: {
    name: string
    brand: string | null
    category: string
    quantity: string | null
    imageUrl: string | null
    barcode: string
  }
  error?: string
}

// Map Open Food Facts categories to our app categories
function mapCategory(categories: string | undefined): string {
  if (!categories) return 'other'

  const lower = categories.toLowerCase()

  if (lower.includes('fruit') || lower.includes('vegetable') || lower.includes('produce')) {
    return 'produce'
  }
  if (lower.includes('dairy') || lower.includes('milk') || lower.includes('cheese') || lower.includes('yogurt')) {
    return 'dairy'
  }
  if (lower.includes('meat') || lower.includes('poultry') || lower.includes('beef') || lower.includes('chicken') || lower.includes('pork')) {
    return 'meat'
  }
  if (lower.includes('frozen')) {
    return 'frozen'
  }
  if (lower.includes('bread') || lower.includes('bakery') || lower.includes('pastry')) {
    return 'bakery'
  }
  if (lower.includes('beverage') || lower.includes('drink') || lower.includes('juice') || lower.includes('soda') || lower.includes('water')) {
    return 'beverages'
  }
  if (lower.includes('condiment') || lower.includes('sauce') || lower.includes('dressing')) {
    return 'condiments'
  }
  if (lower.includes('snack') || lower.includes('chip') || lower.includes('cookie') || lower.includes('candy')) {
    return 'snacks'
  }
  if (lower.includes('seafood') || lower.includes('fish') || lower.includes('shrimp')) {
    return 'seafood'
  }

  return 'pantry'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { barcode } = await req.json()

    if (!barcode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Barcode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Query Open Food Facts API
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'Pantry App - https://github.com/pantry-app',
        },
      }
    )

    const data = await response.json()

    if (data.status !== 1 || !data.product) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Product not found',
        } as BarcodeResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const product = data.product as OpenFoodFactsProduct

    const result: BarcodeResponse = {
      success: true,
      product: {
        name: product.product_name || 'Unknown Product',
        brand: product.brands || null,
        category: mapCategory(product.categories),
        quantity: product.quantity || null,
        imageUrl: product.image_url || null,
        barcode,
      },
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Barcode lookup error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to lookup barcode',
      } as BarcodeResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
