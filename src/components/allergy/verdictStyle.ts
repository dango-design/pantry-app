import { ShieldAlert, ShieldCheck, ShieldQuestion, ShieldX, type LucideIcon } from 'lucide-react'
import type { Verdict } from '@allergy/verdict-engine'

// Allergy verdicts always show a shield icon and words. The shield keeps them apart from pantry's
// freshness colors, which use the same green, yellow and red.
export const VERDICT_ICON: Record<Verdict, LucideIcon> = {
  red: ShieldX,
  yellow: ShieldAlert,
  green: ShieldCheck,
  unknown: ShieldQuestion,
}

export const VERDICT_STYLE: Record<Verdict, string> = {
  red: 'bg-red-50 text-red-800 border-red-300',
  yellow: 'bg-amber-50 text-amber-900 border-amber-300',
  green: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  unknown: 'bg-slate-100 text-slate-700 border-slate-300',
}
