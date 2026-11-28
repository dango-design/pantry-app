import { useId } from 'react'
import { Info, TriangleAlert } from 'lucide-react'
import type { EvaluationResult, ProfileVerdict } from '@allergy/verdict-engine'
import { condenseReasons, highlightWords, LABEL_NOTICE } from '@/allergy/display'
import { SOURCE_LABEL } from '@/allergy/products'
import type { AllergyProfile } from '@/allergy/types'
import { Card, CardContent } from '@/components/common'
import { cn } from '@/utils/cn'
import { VerdictBadge } from './VerdictBadge'
import { VERDICT_ICON } from './verdictStyle'

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** The ingredient list with the given words marked. */
export function IngredientText({ text, words }: { text: string; words: string[] }) {
  const terms = words.filter((w) => w.length > 1).sort((a, b) => b.length - a.length)
  if (terms.length === 0) return <p className="text-sm leading-6 text-gray-800">{text}</p>
  const re = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi')
  const parts = text.split(re)
  return (
    <p className="text-sm leading-6 text-gray-800">
      {parts.map((part, i) =>
        terms.some((w) => w.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="rounded bg-yellow-200 px-0.5 font-semibold text-gray-900">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  )
}

const LINE_COLOR = {
  red: 'text-red-800',
  yellow: 'text-amber-900',
  unknown: 'text-slate-700',
  green: 'text-emerald-800',
} as const

function PersonRow({ row, color }: { row: ProfileVerdict; color?: string }) {
  const lines = condenseReasons(row.reasons)
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color ?? '#6B7280' }} />
          <span className="truncate font-semibold text-gray-900">{row.profileName}</span>
        </span>
        <VerdictBadge verdict={row.verdict} size="sm" />
      </div>
      {row.verdict === 'green' ? (
        <p className="mt-1 text-sm text-gray-600">{row.summary}</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {lines.map((l, i) => {
            const Icon = VERDICT_ICON[l.verdict]
            return (
              <li key={i} className={cn('flex items-start gap-1.5 text-sm', LINE_COLOR[l.verdict])}>
                <Icon aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{l.message}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString()
}

export interface AllergyResultProps {
  result: EvaluationResult
  title: string
  brand?: string | null
  /** The people in the result. Used for their colors and to pick which words to highlight. */
  profiles: AllergyProfile[]
  /** When this app last fetched the record, shown when the source gives no date of its own. */
  fetchedAt?: string | null
  /** Shown when nobody is selected. */
  emptyPeopleMessage?: React.ReactNode
  className?: string
}

/**
 * The full verdict for one product: overall result, one row per person with their reasons, the
 * ingredients with trigger words marked, the source and date, notes, and the "check the label"
 * notice. It only shows what the engine returned.
 */
export function AllergyResult({ result, title, brand, profiles, fetchedAt, emptyPeopleMessage, className }: AllergyResultProps) {
  const headingId = useId()
  const words = highlightWords(result, profiles)
  const notes = result.warnings.filter((w) => !w.affectsVerdict)
  const updated = formatDate(result.display.sourceUpdatedAt)
  const fetched = formatDate(fetchedAt)
  const colorOf = (id: string) => profiles.find((p) => p.id === id)?.color

  return (
    <div className={cn('space-y-3', className)}>
      <Card>
        <CardContent className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {brand && <p className="text-sm text-gray-500">{brand}</p>}
          {result.profiles.length > 0 ? (
            <VerdictBadge verdict={result.overall} size="lg" label={result.storeMade ? 'Store-made: ask staff' : undefined} />
          ) : null}
          {result.confidence.label && <p className="text-sm font-medium text-gray-700">{result.confidence.label}</p>}
        </CardContent>
      </Card>

      {result.profiles.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-gray-700">{emptyPeopleMessage ?? 'Choose who you are checking for.'}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-gray-100">
            {result.profiles.map((row) => (
              <PersonRow key={row.profileId} row={row} color={colorOf(row.profileId)} />
            ))}
          </CardContent>
        </Card>
      )}

      <section aria-labelledby={headingId}>
        <h3 id={headingId} className="mb-2 text-sm font-semibold text-gray-700">
          Ingredients
        </h3>
        {result.display.ingredientsText ? (
          <Card>
            <CardContent className="space-y-2">
              <IngredientText text={result.display.ingredientsText} words={words} />
              {result.display.containsStatement && <p className="text-sm font-semibold text-gray-900">{result.display.containsStatement}</p>}
              {result.display.mayContainStatement && <p className="text-sm font-semibold text-gray-900">{result.display.mayContainStatement}</p>}
              {notes.map((n) => (
                <p key={n.message} className="text-xs text-gray-500">
                  Note: {n.message}. Every word was still checked.
                </p>
              ))}
              <p className="text-xs text-gray-500">
                Source: {result.display.source ? SOURCE_LABEL[result.display.source] : 'unknown'}
                {updated ? ` · updated ${updated}` : fetched ? ` · fetched ${fetched}` : ''}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-800">
            <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {result.storeMade
                ? 'This barcode was printed in the store, so it does not identify a product. Ask staff for the ingredients.'
                : "We don't have the ingredient list for this product, so it can't be checked. Read the label on the package."}
            </p>
          </div>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{LABEL_NOTICE}</p>
      </div>
    </div>
  )
}
