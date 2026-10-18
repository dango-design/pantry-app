import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, X, Link, Loader2 } from 'lucide-react'
import { Button, Dialog, DialogActions, Snackbar } from '@/components/common'
import { useDemoStore, DEMO_USER, DEMO_HOUSEHOLD } from '@/stores/demoStore'
import { importRecipeFromUrl } from '@/services/aiApi'
import type { QuantityUnit, DietaryRestriction } from '@/types'

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

const DIETARY_OPTIONS: { key: DietaryRestriction; label: string }[] = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'gluten_free', label: 'Gluten-Free' },
  { key: 'dairy_free', label: 'Dairy-Free' },
  { key: 'nut_free', label: 'Nut-Free' },
  { key: 'low_carb', label: 'Low Carb' },
  { key: 'keto', label: 'Keto' },
]

interface IngredientRow {
  name: string
  quantity: number
  unit: QuantityUnit
  preparation: string
  isOptional: boolean
}

export function RecipeFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = id !== undefined && id !== 'new'
  const { recipes, addRecipe, updateRecipe } = useDemoStore()

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { name: '', quantity: 1, unit: 'count', preparation: '', isOptional: false },
  ])
  const [instructions, setInstructions] = useState<string[]>([''])
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [servings, setServings] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [tags, setTags] = useState('')
  const [dietaryInfo, setDietaryInfo] = useState<Set<DietaryRestriction>>(new Set())
  const [imageUrl, setImageUrl] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [notes, setNotes] = useState('')

  // Import dialog
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '' })

  // Load existing recipe for editing
  useEffect(() => {
    if (!isEditing) return
    const recipe = recipes.find((r) => r.id === id)
    if (!recipe) return

    setName(recipe.name)
    setDescription(recipe.description || '')
    setIngredients(
      recipe.ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        preparation: ing.preparation || '',
        isOptional: ing.isOptional,
      }))
    )
    setInstructions(recipe.instructions.length > 0 ? recipe.instructions : [''])
    setPrepTime(recipe.prepTimeMinutes?.toString() || '')
    setCookTime(recipe.cookTimeMinutes?.toString() || '')
    setServings(recipe.servings?.toString() || '')
    setDifficulty(recipe.difficulty || '')
    setCuisine(recipe.cuisine || '')
    setTags(recipe.tags.join(', '))
    setDietaryInfo(new Set(recipe.dietaryInfo))
    setImageUrl(recipe.imageUrl || '')
    setSourceUrl(recipe.sourceUrl || '')
    setNotes(recipe.notes || '')
  }, [id, isEditing, recipes])

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: 1, unit: 'count', preparation: '', isOptional: false }])
  }

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length <= 1) return
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleIngredientChange = (index: number, field: keyof IngredientRow, value: any) => {
    setIngredients(ingredients.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)))
  }

  const handleAddInstruction = () => {
    setInstructions([...instructions, ''])
  }

  const handleRemoveInstruction = (index: number) => {
    if (instructions.length <= 1) return
    setInstructions(instructions.filter((_, i) => i !== index))
  }

  const handleInstructionChange = (index: number, value: string) => {
    setInstructions(instructions.map((step, i) => (i === index ? value : step)))
  }

  const handleDietaryToggle = (key: DietaryRestriction) => {
    const newSet = new Set(dietaryInfo)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setDietaryInfo(newSet)
  }

  const handleImport = async () => {
    if (!importUrl.trim()) return
    setImporting(true)

    try {
      const result = await importRecipeFromUrl(importUrl.trim())
      if (result.success && result.recipe) {
        const r = result.recipe
        setName(r.name)
        if (r.description) setDescription(r.description)
        if (r.ingredients?.length) {
          setIngredients(r.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: (ing.unit as QuantityUnit) || 'count',
            preparation: ing.preparation || '',
            isOptional: ing.isOptional,
          })))
        }
        if (r.instructions?.length) setInstructions(r.instructions)
        if (r.prepTimeMinutes) setPrepTime(r.prepTimeMinutes.toString())
        if (r.cookTimeMinutes) setCookTime(r.cookTimeMinutes.toString())
        if (r.servings) setServings(r.servings.toString())
        if (r.cuisine) setCuisine(r.cuisine)
        if (r.imageUrl) setImageUrl(r.imageUrl)
        setSourceUrl(importUrl.trim())
        setShowImportDialog(false)
        setSnackbar({ open: true, message: 'Recipe imported successfully!' })
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to import recipe' })
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to import recipe' })
    } finally {
      setImporting(false)
    }
  }

  const handleSubmit = () => {
    if (!name.trim()) return

    // Filter out empty ingredients and instructions
    const cleanIngredients = ingredients
      .filter((ing) => ing.name.trim())
      .map((ing) => ({
        name: ing.name.trim(),
        quantity: ing.quantity,
        unit: ing.unit,
        preparation: ing.preparation.trim() || undefined,
        isOptional: ing.isOptional,
      }))

    const cleanInstructions = instructions.filter((step) => step.trim())

    const recipeData = {
      householdId: DEMO_HOUSEHOLD.id,
      name: name.trim(),
      description: description.trim() || undefined,
      ingredients: cleanIngredients,
      instructions: cleanInstructions,
      prepTimeMinutes: prepTime ? parseInt(prepTime) : undefined,
      cookTimeMinutes: cookTime ? parseInt(cookTime) : undefined,
      servings: servings ? parseInt(servings) : undefined,
      difficulty: (difficulty || undefined) as 'easy' | 'medium' | 'hard' | undefined,
      cuisine: cuisine.trim() || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      dietaryInfo: [...dietaryInfo],
      imageUrl: imageUrl.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      isFavorite: false,
      timesCooked: 0,
      source: 'user' as const,
      createdBy: DEMO_USER.id,
    }

    if (isEditing) {
      updateRecipe(id!, recipeData)
    } else {
      addRecipe(recipeData)
    }

    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-lg mx-auto flex flex-col flex-1 w-full">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Recipe' : 'New Recipe'}
            </h1>
            <div className="w-9" />
          </div>
        </header>

        {/* Import button */}
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <button
            onClick={() => setShowImportDialog(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-soft text-primary rounded-xl hover:bg-primary-muted transition-colors"
          >
            <Link className="h-5 w-5" />
            <span className="font-medium">Import from URL</span>
          </button>
        </div>

        {/* Form */}
        <div className="bg-white px-4 pt-4 pb-32 flex-1">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipe Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g. Chicken Stir-Fry"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Brief description..."
              />
            </div>

            {/* Ingredients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ingredients</label>
              <div className="space-y-2">
                {ingredients.map((ing, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={ing.quantity}
                          onChange={(e) => handleIngredientChange(index, 'quantity', Number(e.target.value) || 0)}
                          className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          min="0"
                          step="0.25"
                        />
                        <select
                          value={ing.unit}
                          onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                          className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                        >
                          <option value="count">ct</option>
                          <option value="cup">cup</option>
                          <option value="tbsp">tbsp</option>
                          <option value="tsp">tsp</option>
                          <option value="oz">oz</option>
                          <option value="lb">lb</option>
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                          <option value="l">L</option>
                          <option value="pack">pack</option>
                          <option value="unit">unit</option>
                        </select>
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Ingredient name"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={ing.preparation}
                          onChange={(e) => handleIngredientChange(index, 'preparation', e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Prep (e.g. diced)"
                        />
                        <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={ing.isOptional}
                            onChange={(e) => handleIngredientChange(index, 'isOptional', e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-primary"
                          />
                          Optional
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveIngredient(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 mt-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddIngredient}
                className="mt-2 flex items-center gap-1 text-sm text-primary font-medium hover:text-primary-hover"
              >
                <Plus className="h-4 w-4" /> Add ingredient
              </button>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
              <div className="space-y-2">
                {instructions.map((step, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary-muted text-primary rounded-full flex items-center justify-center text-xs font-medium mt-2">
                      {index + 1}
                    </span>
                    <textarea
                      value={step}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      placeholder={`Step ${index + 1}...`}
                    />
                    <button
                      onClick={() => handleRemoveInstruction(index)}
                      className="p-1.5 text-gray-400 hover:text-red-500 mt-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddInstruction}
                className="mt-2 flex items-center gap-1 text-sm text-primary font-medium hover:text-primary-hover"
              >
                <Plus className="h-4 w-4" /> Add step
              </button>
            </div>

            {/* Time + Servings row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Prep (min)</label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  min="0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cook (min)</label>
                <input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  min="0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  min="1"
                />
              </div>
            </div>

            {/* Difficulty + Cuisine */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label>
                <input
                  type="text"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Italian"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="dinner, quick, comfort food"
              />
              <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
            </div>

            {/* Dietary Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Info</label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleDietaryToggle(opt.key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      dietaryInfo.has(opt.key)
                        ? 'bg-primary text-white border-transparent'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://..."
              />
            </div>

            {/* Source URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Personal notes about this recipe..."
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button variant="secondary" onClick={() => navigate(-1)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="flex-1 bg-primary hover:bg-primary-hover"
            >
              {isEditing ? 'Save Changes' : 'Create Recipe'}
            </Button>
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        title="Import Recipe from URL"
        description="Paste a recipe URL and we'll extract the details automatically."
      >
        <input
          type="url"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="https://example.com/recipe"
        />
        <DialogActions>
          <Button variant="secondary" onClick={() => setShowImportDialog(false)}>Cancel</Button>
          <Button onClick={handleImport} loading={importing} disabled={!importUrl.trim()}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Importing...
              </>
            ) : (
              'Import'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        onClose={() => setSnackbar({ open: false, message: '' })}
      />
    </div>
  )
}
