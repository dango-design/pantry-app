import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a recipe suggestion assistant. Given a list of ingredients the user has available, suggest 3-5 recipes they can make.

Return a JSON object with a "recipes" array. Each recipe should have:
- name: string
- description: string (1-2 sentences)
- ingredients: array of { name, quantity (number), unit (string), preparation (optional string), isOptional (boolean) }
- instructions: array of strings (step-by-step)
- prepTimeMinutes: number
- cookTimeMinutes: number
- servings: number
- difficulty: "easy" | "medium" | "hard"
- cuisine: string

Prioritize recipes that use the most available ingredients.
For units, use: count, cup, tbsp, tsp, oz, lb, g, kg, ml, l, pack, unit.
Keep recipes practical and achievable with common pantry staples beyond the listed ingredients.`

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

    const { ingredients } = await req.json()
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ingredients list is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
            content: `I have these ingredients available: ${ingredients.join(', ')}. Suggest recipes I can make.`,
          },
        ],
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to suggest recipes' }),
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

    const parsed = JSON.parse(content)
    const recipes = parsed.recipes || (Array.isArray(parsed) ? parsed : [])

    return new Response(
      JSON.stringify({ success: true, recipes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Suggest recipes error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to suggest recipes' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
