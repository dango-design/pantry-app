import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a recipe extraction assistant. Given the HTML content of a recipe page, extract the recipe details into a structured JSON format.

Return a JSON object with these fields:
- name: string (the recipe title)
- description: string (brief description)
- ingredients: array of objects with { name, quantity (number), unit (string), preparation (optional string), isOptional (boolean) }
- instructions: array of strings (step-by-step instructions)
- prepTimeMinutes: number or null
- cookTimeMinutes: number or null
- servings: number or null
- cuisine: string or null
- imageUrl: string or null (the main recipe image URL)

For quantities, convert fractions to decimals (1/2 = 0.5, 1/4 = 0.25, etc).
For units, use: count, cup, tbsp, tsp, oz, lb, g, kg, ml, l, pack, unit.
If no items are detected, return {"name": "", "ingredients": [], "instructions": []}.`

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

    const { url } = await req.json()
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the recipe page
    const pageResponse = await fetch(url, {
      headers: { 'User-Agent': 'PantryApp/1.0 RecipeImporter' },
    })

    if (!pageResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch recipe page' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const html = await pageResponse.text()

    // Truncate HTML to avoid token limits (keep first 15000 chars)
    const truncatedHtml = html.length > 15000 ? html.substring(0, 15000) : html

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
          { role: 'user', content: `Extract the recipe from this page:\n\n${truncatedHtml}` },
        ],
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to extract recipe' }),
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

    const recipe = JSON.parse(content)

    return new Response(
      JSON.stringify({ success: true, recipe }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Import recipe error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to import recipe' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
