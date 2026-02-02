import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DetectedItem {
  name: string
  category: string
  quantity: number
  quantityUnit: string
  brand?: string
  confidence: number
}

interface ProcessImageResponse {
  success: boolean
  items?: DetectedItem[]
  error?: string
}

const SYSTEM_PROMPT = `You are a grocery item detection assistant. Analyze the provided image and identify food items visible in the photo.

For each item, provide:
- name: The specific product name (e.g., "Organic Whole Milk", "Granny Smith Apples")
- category: One of: produce, dairy, meat, seafood, frozen, bakery, beverages, condiments, snacks, pantry, other
- quantity: Estimated count or amount
- quantityUnit: One of: count, lb, oz, kg, g, L, mL, gallon, quart, pint, cup
- brand: Brand name if visible
- confidence: 0.0-1.0 how confident you are in the detection

Respond with a JSON object containing an "items" array. If no food items are detected, return {"items": []}.
Example response format:
{
  "items": [
    {"name": "2% Milk", "category": "dairy", "quantity": 1, "quantityUnit": "gallon", "brand": "Horizon", "confidence": 0.95},
    {"name": "Bananas", "category": "produce", "quantity": 6, "quantityUnit": "count", "confidence": 0.9}
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
        JSON.stringify({ success: false, error: 'Image is required (base64 or URL)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build the image content for OpenAI
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
              { type: 'text', text: 'Please identify all food items in this image.' },
              imageContent,
            ],
          },
        ],
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', response.status, errorText)

      // Parse error for better message
      let errorMessage = 'Failed to analyze image'
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

    // Parse the JSON response
    let items: DetectedItem[]
    try {
      const parsed = JSON.parse(content)
      // Handle both {"items": [...]} and direct array formats
      items = parsed.items || (Array.isArray(parsed) ? parsed : [])
    } catch (parseError) {
      console.error('Failed to parse AI response:', content, parseError)
      items = []
    }

    // Validate and clean up items
    items = items.filter(item =>
      item.name &&
      typeof item.name === 'string' &&
      item.category &&
      typeof item.quantity === 'number'
    ).map(item => ({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      quantityUnit: item.quantityUnit || 'count',
      brand: item.brand,
      confidence: item.confidence || 0.5,
    }))

    const result: ProcessImageResponse = {
      success: true,
      items,
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process image error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to process image' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
