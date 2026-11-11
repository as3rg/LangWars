import { t, useLocale } from './i18n'
import { formatNumber } from './numbers'

export function formatRelative(iso?: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  if (Number.isNaN(diff)) return '—'
  const seconds = Math.round(diff / 1000)
  if (seconds < 45) return t('just now')
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return t('{count}m ago', { count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('{count}h ago', { count: hours })
  const days = Math.round(hours / 24)
  if (days < 30) return t('{count}d ago', { count: days })
  return date.toLocaleDateString(useLocale.getState().locale, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(useLocale.getState().locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return t('{count} ms', { count: formatNumber(ms) })
  return t('{count} s', { count: formatNumber(ms / 1000) })
}

export function countdown(iso?: string): string {
  if (!iso) return '—'
  const target = new Date(iso).getTime()
  const diff = target - Date.now()
  if (diff <= 0) return t('ended')
  const hours = Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return t('{days}d {hours}h left', { days, hours: hours % 24 })
  }
  return t('{hours}h {minutes}m left', { hours, minutes })
}
