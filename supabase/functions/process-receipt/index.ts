import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReceiptItem {
  name: string
  category: string
  quantity: number
  quantityUnit: string
  price?: number
  confidence: number
}

interface ProcessReceiptResponse {
  success: boolean
  storeName?: string
  date?: string
  items?: ReceiptItem[]
  total?: number
  error?: string
}

const SYSTEM_PROMPT = `You are a receipt parsing assistant. Analyze the provided receipt image and extract purchased items.

For each item on the receipt:
- name: Clean product name (remove item codes, abbreviations - expand to full name)
- category: One of: produce, dairy, meat, seafood, frozen, bakery, beverages, condiments, snacks, pantry, other
- quantity: Number of items (default 1 if not specified)
- quantityUnit: Usually "count" for receipts, or "lb" if weight-based
- price: Item price if visible
- confidence: 0.0-1.0 how confident you are

Also extract:
- storeName: Name of the store
- date: Purchase date in YYYY-MM-DD format if visible
- total: Total amount if visible

Common receipt abbreviations to expand:
- ORG = Organic
- GRN = Green
- RED = Red
- BN = Banana
- APL = Apple
- MLK = Milk
- YGT = Yogurt
- CHK = Chicken
- BF = Beef

Respond with JSON in this format:
{
  "storeName": "Store Name",
  "date": "2024-01-15",
  "total": 45.67,
  "items": [
    {"name": "Organic Bananas", "category": "produce", "quantity": 1, "quantityUnit": "lb", "price": 1.99, "confidence": 0.9}
  ]
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { imageBase64, imageUrl } = await req.json()

    if (!imageBase64 && !imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Receipt image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const imageContent = imageUrl
      ? { type: 'image_url', image_url: { url: imageUrl } }
      : { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Please extract all items from this receipt.' },
              imageContent,
            ],
          },
        ],
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', response.status, errorText)

      let errorMessage = 'Failed to process receipt'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error?.message || errorMessage
      } catch {
        // Use default message
      }

      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      console.error('Failed to parse AI response:', content)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse receipt data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate and clean up items
    const items: ReceiptItem[] = (parsed.items || [])
      .filter((item: any) =>
        item.name &&
        typeof item.name === 'string' &&
        item.category
      )
      .map((item: any) => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity || 1,
        quantityUnit: item.quantityUnit || 'count',
        price: typeof item.price === 'number' ? item.price : undefined,
        confidence: item.confidence || 0.5,
      }))

    const result: ProcessReceiptResponse = {
      success: true,
      storeName: parsed.storeName,
      date: parsed.date,
      total: typeof parsed.total === 'number' ? parsed.total : undefined,
      items,
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process receipt error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to process receipt' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
