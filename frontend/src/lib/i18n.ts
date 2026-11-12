import { create } from 'zustand'
import { ru } from './ru'

export type Locale = 'en' | 'ru'
const KEY = 'langwars.locale'
function initialLocale(): Locale {
  try { const saved = localStorage.getItem(KEY); if (saved === 'en' || saved === 'ru') return saved } catch { /* storage unavailable */ }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}
export const useLocale = create<{ locale: Locale; setLocale: (locale: Locale) => void }>((set) => ({
  locale: initialLocale(),
  setLocale(locale) { try { localStorage.setItem(KEY, locale) } catch { /* storage unavailable */ }; set({ locale }); if (typeof document !== 'undefined') document.documentElement.lang = locale },
}))

export function t(text: string, values?: Record<string, string | number>): string {
  if (!values && useLocale.getState().locale === 'ru') {
    const cooldown = text.match(/^Try again in ([\d.]+) seconds$/)
    if (cooldown) return t('Try again in {seconds} seconds', { seconds: cooldown[1] })
    const comparisons = text.match(/^Submissions are paused: solution comparisons are full \((\d+)\/(\d+)\)\. Try again shortly\.$/)
    if (comparisons) return t('Submissions are paused: solution comparisons are full ({pending}/{capacity}). Try again shortly.', { pending: comparisons[1], capacity: comparisons[2] })
    const fee = text.match(/^Submitting this solved task costs (\d+) points$/)
    if (fee) return t('Resubmission costs {points} points. Review the updated price before submitting.', { points: fee[1] })
    if (/contains a word blocked by the platform$/.test(text)) return t('This text contains a blocked word.')
  }
  const translated = useLocale.getState().locale === 'ru' ? ru[text] ?? (ru[text.trim()] ? text.replace(text.trim(), ru[text.trim()]) : text) : text
  return values ? translated.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match)) : translated
}

export function localizeTask<T extends { title: string; translations?: Partial<Record<Locale, { title: string; statement?: string; constraints?: string[]; examples?: unknown[] }>> }>(task: T, locale: Locale): T {
  const translation = task.translations?.[locale] ?? task.translations?.en ?? task.translations?.ru
  return translation ? { ...task, ...translation } : task
}
