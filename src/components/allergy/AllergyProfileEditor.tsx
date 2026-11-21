import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { CustomAvoid, ProfileAllergen, Severity } from '@allergy/verdict-engine'
import { ALLERGEN_HINTS, allergenChoices } from '@/allergy/dictionary'
import { PROFILE_COLORS, type AllergyProfileInput } from '@/allergy/types'
import { Button, Card, CardContent } from '@/components/common'
import { cn } from '@/utils/cn'

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: 'severe', label: 'Severe' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'mild', label: 'Mild' },
]

export interface AllergyProfileEditorProps {
  /** The person being edited, or undefined for a new person. */
  initial?: AllergyProfileInput
  /** Picks the default color for a new person. */
  existingCount?: number
  onSave: (input: AllergyProfileInput) => void
  onCancel: () => void
  onDelete?: () => void
}

/** Edit one person: name, color, allergens, how severe, whether "may contain" counts, other words. */
export function AllergyProfileEditor({ initial, existingCount = 0, onSave, onCancel, onDelete }: AllergyProfileEditorProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PROFILE_COLORS[existingCount % PROFILE_COLORS.length]!)
  const [allergens, setAllergens] = useState<ProfileAllergen[]>(initial?.allergens ?? [])
  const [avoids, setAvoids] = useState<CustomAvoid[]>(initial?.customAvoids ?? [])
  const [newAvoid, setNewAvoid] = useState('')
  const choices = allergenChoices()

  const toggle = (allergenId: string) =>
    setAllergens((list) =>
      list.some((a) => a.allergenId === allergenId)
        ? list.filter((a) => a.allergenId !== allergenId)
        : [...list, { allergenId, severity: 'severe', avoidMayContain: true }],
    )
  const patch = (allergenId: string, p: Partial<ProfileAllergen>) =>
    setAllergens((list) => list.map((a) => (a.allergenId === allergenId ? { ...a, ...p } : a)))

  const addAvoid = () => {
    const term = newAvoid.trim().toLowerCase()
    if (term.length >= 2 && !avoids.some((a) => a.term === term)) setAvoids([...avoids, { term, severity: 'moderate' }])
    setNewAvoid('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), color, allergens, customAvoids: avoids })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="person-name" className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="person-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sam"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700">Color</legend>
            <div className="flex flex-wrap gap-2">
              {PROFILE_COLORS.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${i + 1}`}
                  aria-pressed={c === color}
                  onClick={() => setColor(c)}
                  className={cn('flex h-9 w-9 items-center justify-center rounded-full ring-offset-2', c === color && 'ring-2 ring-gray-900')}
                  style={{ backgroundColor: c }}
                >
                  {c === color && <Check aria-hidden className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Allergens</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Allergens">
          {choices.map((a) => {
            const on = allergens.some((x) => x.allergenId === a.id)
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(a.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium',
                  on ? 'border-transparent bg-primary text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                )}
              >
                {on && <Check aria-hidden className="h-3.5 w-3.5" />}
                {a.displayName}
              </button>
            )
          })}
        </div>
      </section>

      {allergens.map((a) => {
        const info = choices.find((x) => x.id === a.allergenId)
        const avoidMayContain = a.avoidMayContain ?? a.severity === 'severe'
        return (
          <Card key={a.allergenId}>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-gray-900">{info?.displayName ?? a.allergenId}</p>
                {ALLERGEN_HINTS[a.allergenId] && <p className="text-sm text-gray-500">{ALLERGEN_HINTS[a.allergenId]}</p>}
              </div>
              <div role="radiogroup" aria-label={`How severe is the ${info?.displayName ?? a.allergenId} allergy`} className="flex rounded-lg bg-gray-100 p-1">
                {SEVERITIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={a.severity === s.value}
                    onClick={() =>
                      patch(a.allergenId, { severity: s.value, avoidMayContain: s.value === 'severe' ? true : a.avoidMayContain })
                    }
                    className={cn(
                      'flex-1 rounded-md py-1.5 text-sm font-medium',
                      a.severity === s.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
                <span>Treat "may contain" and shared-facility warnings as not safe</span>
                <input
                  type="checkbox"
                  checked={avoidMayContain}
                  onChange={(e) => patch(a.allergenId, { avoidMayContain: e.target.checked })}
                  className="h-5 w-5 shrink-0 accent-primary"
                />
              </label>
            </CardContent>
          </Card>
        )
      })}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Other things to avoid</h2>
        <p className="text-sm text-gray-500">Any ingredient word, such as garlic or kiwi. Vague words like "spices" will show as "check first".</p>
        {avoids.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {avoids.map((c) => (
              <button
                key={c.term}
                type="button"
                onClick={() => setAvoids(avoids.filter((x) => x.term !== c.term))}
                aria-label={`Remove ${c.term}`}
                className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-300"
              >
                {c.term}
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            aria-label="Add a word to avoid"
            value={newAvoid}
            onChange={(e) => setNewAvoid(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addAvoid()
              }
            }}
            placeholder="Add a word"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button type="button" variant="secondary" onClick={addAvoid} disabled={newAvoid.trim().length < 2}>
            Add
          </Button>
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={!name.trim()}>
          Save
        </Button>
      </div>
      {onDelete && (
        <Button type="button" variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={onDelete}>
          Delete this person
        </Button>
      )}
    </form>
  )
}
