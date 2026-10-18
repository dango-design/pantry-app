import type { Recipe, RecipeIngredient, FoodItem } from '@/types'
import { getDaysUntilExpiration } from './freshness'

export interface IngredientMatch {
  ingredient: RecipeIngredient
  matched: boolean
  matchedItem?: FoodItem
  isExpiring?: boolean // true if matched item expires within 3 days
}

export interface RecipeMatchResult {
  recipe: Recipe
  matchScore: number // 0-100
  availableIngredients: IngredientMatch[]
  missingIngredients: IngredientMatch[]
  expiringIngredientsUsed: number
}

/**
 * Check if a food item name matches a recipe ingredient name.
 * Tries exact match, then substring match, then substitutes.
 */
export function ingredientMatchesItem(ingredient: RecipeIngredient, item: FoodItem): boolean {
  const ingredientName = ingredient.name.toLowerCase()
  const itemName = item.name.toLowerCase()

  // Exact match
  if (ingredientName === itemName) return true

  // Substring match (e.g., "chicken" matches "Chicken Thighs")
  if (itemName.includes(ingredientName) || ingredientName.includes(itemName)) return true

  // Check substitutes
  if (ingredient.substitutes) {
    for (const sub of ingredient.substitutes) {
      const subLower = sub.toLowerCase()
      if (subLower === itemName || itemName.includes(subLower) || subLower.includes(itemName)) {
        return true
      }
    }
  }

  return false
}

/**
 * Check if a food item is expiring soon (within 3 days)
 */
function isExpiringSoon(item: FoodItem): boolean {
  return getDaysUntilExpiration(item.expirationDate) <= 3
}

/**
 * Match a single recipe against the current inventory
 */
export function matchRecipeToInventory(
  recipe: Recipe,
  inventory: FoodItem[]
): RecipeMatchResult {
  const activeItems = inventory.filter((item) => item.status === 'active' && item.quantity > 0)
  const availableIngredients: IngredientMatch[] = []
  const missingIngredients: IngredientMatch[] = []
  let expiringIngredientsUsed = 0

  // Only count required ingredients for the score
  const requiredIngredients = recipe.ingredients.filter((ing) => !ing.isOptional)

  for (const ingredient of recipe.ingredients) {
    const matchedItem = activeItems.find((item) => ingredientMatchesItem(ingredient, item))

    if (matchedItem) {
      const expiring = isExpiringSoon(matchedItem)
      if (expiring) expiringIngredientsUsed++
      availableIngredients.push({
        ingredient,
        matched: true,
        matchedItem,
        isExpiring: expiring,
      })
    } else {
      missingIngredients.push({
        ingredient,
        matched: false,
      })
    }
  }

  // Score based on required ingredients only
  const requiredMatched = requiredIngredients.filter((ing) =>
    availableIngredients.some((a) => a.ingredient === ing)
  ).length
  const matchScore = requiredIngredients.length > 0
    ? Math.round((requiredMatched / requiredIngredients.length) * 100)
    : 100

  return {
    recipe,
    matchScore,
    availableIngredients,
    missingIngredients,
    expiringIngredientsUsed,
  }
}

/**
 * Match all recipes against inventory, sorted by priority:
 * 1. Recipes that use expiring ingredients first
 * 2. Then by match score (highest first)
 */
export function matchAllRecipes(
  recipes: Recipe[],
  inventory: FoodItem[]
): RecipeMatchResult[] {
  const results = recipes.map((recipe) => matchRecipeToInventory(recipe, inventory))

  return results.sort((a, b) => {
    // Prioritize recipes using expiring ingredients
    if (a.expiringIngredientsUsed !== b.expiringIngredientsUsed) {
      return b.expiringIngredientsUsed - a.expiringIngredientsUsed
    }
    // Then by match score
    return b.matchScore - a.matchScore
  })
}
