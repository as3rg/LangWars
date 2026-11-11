import type { BreakImpact, UserNotification } from '@/api/types'
import { t } from './i18n'

const SOLUTION_KINDS = new Set(['accepted', 'rejected', 'broken', 'repaired', 'breaking'])
export function isSolutionNotification(item: UserNotification): boolean { return SOLUTION_KINDS.has(item.kind) }

// The same semantic hue is used for a popup and its retained history entry.
export function notificationTone(kind: UserNotification['kind']): 'positive' | 'negative' | 'golden' | 'neutral' {
  if (kind === 'accepted' || kind === 'repaired' || kind === 'success') return 'positive'
  if (kind === 'broken' || kind === 'rejected' || kind === 'error') return 'negative'
  return kind === 'breaking' ? 'golden' : 'neutral'
}

export function impactText(impact: BreakImpact): string {
  return impact.usernames?.length ? impact.usernames.join(', ') : t('{count} players', { count: impact.userCount })
}

export function notificationText(item: UserNotification, taskTitle = item.taskTitle): string {
  const task = taskTitle ?? t('Task')
  switch (item.kind) {
    case 'accepted': return t('{task} · accepted', { task })
    case 'rejected': return t('{task} · not accepted', { task })
    case 'repaired': return t('{task} · passed again', { task })
    case 'broken': return item.breaker
      ? t('{task} · was broken by {player}', { task, player: item.breaker.username })
      : t('{task} · solution was broken', { task })
    case 'breaking': return t('{task} · you broke solutions of {players}', { task, players: item.impact ? impactText(item.impact) : t('other players') })
    default: return t(item.message ?? '')
  }
}

// A fresh visit shows old unread events in the bell without replaying old effects.
// Generic notices originated from an existing popup and must never echo from polling.
export class NotificationTracker {
  private initialized = false
  private seen = new Set<string>()
  observe(items: UserNotification[]): UserNotification[] {
    const fresh = this.initialized ? items.filter((item) => !this.seen.has(item.id) && !item.read && isSolutionNotification(item)) : []
    for (const item of items) this.seen.add(item.id)
    this.initialized = true
    if (this.seen.size > 2000) this.seen = new Set([...this.seen].slice(-1000))
    return fresh.sort((left, right) => (left.occurredAt ?? left.createdAt).localeCompare(right.occurredAt ?? right.createdAt) || left.id.localeCompare(right.id))
  }
}
