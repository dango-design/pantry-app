// Turns the engine's result into words for the screen. Nothing here changes a verdict: it only picks
// which of the engine's own reasons and words to show.

import type { EvaluationResult, Reason, Verdict } from '@allergy/verdict-engine'
import { allergenName } from './dictionary'
import type { AllergyProfile } from './types'

/** Words for each verdict. A verdict is always shown with an icon and words, never color alone. */
export const VERDICT_LABEL: Record<Verdict, string> = {
  red: 'Not safe',
  yellow: 'Check first',
  green: 'No listed allergens',
  unknown: 'Unknown',
}

/** Worst first: red, then unknown, then yellow, then green. */
export const VERDICT_RANK: Record<Verdict, number> = { green: 0, yellow: 1, unknown: 2, red: 3 }

export const LABEL_NOTICE = 'Always check the label on the package too. Recipes change, and databases can be wrong.'

/** One line per allergen (or custom avoid): the strongest finding, with its evidence words merged. */
export function condenseReasons(reasons: Reason[]): { verdict: Verdict; message: string }[] {
  const groups = new Map<string, Reason[]>()
  for (const r of reasons) {
    const key = r.allergenId ?? (r.customTerm ? `~${r.customTerm}` : `#${r.ruleId}:${r.message}`)
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  const out: { verdict: Verdict; message: string }[] = []
  for (const list of groups.values()) {
    const top = Math.max(...list.map((r) => VERDICT_RANK[r.verdict]))
    const strongest = list.filter((r) => VERDICT_RANK[r.verdict] === top)
    const terms = strongest.filter((r) => r.ruleId === 'contains_term' || r.ruleId === 'possible_term')
    const first = strongest[0]!
    if (terms.length > 1 && first.allergenId) {
      const words = [...new Set(terms.map((r) => r.evidenceText))].join(', ')
      const name = allergenName(first.allergenId).toLowerCase()
      out.push({ verdict: first.verdict, message: terms[0]!.ruleId === 'contains_term' ? `Contains ${name} (${words})` : `Check: ${words}` })
    } else {
      out.push({ verdict: first.verdict, message: (terms[0] ?? first).message })
    }
  }
  return out.sort((a, b) => VERDICT_RANK[b.verdict] - VERDICT_RANK[a.verdict])
}

/**
 * The ingredient words to highlight: only those that matter for the people shown, plus their own
 * custom avoid words. Tag-based signals are left out because their words are not in the text.
 */
export function highlightWords(result: EvaluationResult, profiles: AllergyProfile[]): string[] {
  const relevant = new Set(profiles.flatMap((p) => p.allergens.map((a) => a.allergenId)))
  return [
    ...new Set([
      ...result.signals
        .filter((s) => relevant.has(s.allergenId) && s.ruleId !== 'contains_tag' && s.ruleId !== 'trace_tag')
        .map((s) => s.evidenceText),
      ...profiles.flatMap((p) => (p.customAvoids ?? []).map((a) => a.term)),
    ]),
  ]
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * Short words for a badge on a pantry card or the add page, such as "Not safe for Sam". detail is the
 * first reason of the worst person, for a tooltip or screen reader.
 */
export function badgeSummary(result: EvaluationResult): { verdict: Verdict; text: string; detail: string } {
  const worst = result.profiles.filter((p) => p.verdict === result.overall)
  const names = joinNames(worst.map((p) => p.profileName))
  const detail = worst[0]?.summary ?? VERDICT_LABEL[result.overall]
  if (result.storeMade) return { verdict: 'unknown', text: 'Store-made: ask staff', detail: 'Store-made item: ask staff' }
  switch (result.overall) {
    case 'red':
      return { verdict: 'red', text: `Not safe for ${names}`, detail }
    case 'yellow':
      return { verdict: 'yellow', text: `Check first for ${names}`, detail }
    case 'unknown':
      return {
        verdict: 'unknown',
        text: result.display.ingredientsText ? 'Unknown' : 'No ingredient list',
        detail,
      }
    default:
      return { verdict: 'green', text: VERDICT_LABEL.green, detail }
  }
}

/** The names of the people this product is not safe for, with the reason for each. */
export function redPeople(result: EvaluationResult): { name: string; reason: string }[] {
  return result.profiles
    .filter((p) => p.verdict === 'red')
    .map((p) => ({ name: p.profileName, reason: condenseReasons(p.reasons).find((r) => r.verdict === 'red')?.message ?? p.summary }))
}
