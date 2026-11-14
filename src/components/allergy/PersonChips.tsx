import { Check } from 'lucide-react'
import type { AllergyProfile } from '@/allergy/types'
import { cn } from '@/utils/cn'

export interface PersonChipsProps {
  profiles: Pick<AllergyProfile, 'id' | 'name' | 'color'>[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  label?: string
  className?: string
}

/** Who you are checking for. Each person is a toggle button. */
export function PersonChips({ profiles, selectedIds, onChange, label = 'Checking for', className }: PersonChipsProps) {
  if (profiles.length === 0) return null
  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  return (
    <div className={className}>
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {profiles.map((p) => {
          const on = selectedIds.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(p.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                on ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
              {on && <Check aria-hidden className="h-3.5 w-3.5" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
