import type { Verdict } from '@allergy/verdict-engine'
import { VERDICT_LABEL } from '@/allergy/display'
import { cn } from '@/utils/cn'
import { VERDICT_ICON, VERDICT_STYLE } from './verdictStyle'

export interface VerdictBadgeProps {
  verdict: Verdict
  /** Words to show. Defaults to the verdict's own words, such as "Not safe". */
  label?: string
  size?: 'sm' | 'md' | 'lg'
  /** Longer text for a tooltip and screen readers, such as the first reason. */
  detail?: string
  className?: string
}

export function VerdictBadge({ verdict, label, size = 'md', detail, className }: VerdictBadgeProps) {
  const Icon = VERDICT_ICON[verdict]
  const text = label ?? VERDICT_LABEL[verdict]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold max-w-full',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-sm',
        size === 'lg' && 'px-3 py-1.5 text-base',
        VERDICT_STYLE[verdict],
        className,
      )}
      title={detail}
      aria-label={detail && detail !== text ? `${text}. ${detail}` : text}
    >
      <Icon aria-hidden className={cn('shrink-0', size === 'sm' ? 'h-3.5 w-3.5' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5')} />
      <span className="truncate">{text}</span>
    </span>
  )
}
