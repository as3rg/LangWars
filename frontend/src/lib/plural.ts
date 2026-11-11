import { t, useLocale } from './i18n'

export function plural(count: number, singular: string, pluralForm?: string): string {
  if (useLocale.getState().locale === 'ru') return `${count} ${t(pluralForm ?? `${singular}s`)}`
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`
}
