import type { BreakImpact } from '@/api/types'
import { Zap } from 'lucide-react'
import { impactText } from '@/lib/notifications'
import { t, useLocale } from '@/lib/i18n'

export function BreakImpactBadge({ impact }: { impact?: BreakImpact }) {
  useLocale()
  if (!impact?.userCount) return <span className="dim">—</span>
  const players = impactText(impact)
  return <span className="badge badge-violet break-impact" title={t('Broken solutions of {players}', { players })}><Zap size={11} aria-hidden="true" />{players}</span>
}
