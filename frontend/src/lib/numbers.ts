import { useLocale } from './i18n'

/** Display precision only; judge values and ranking arithmetic keep their original precision. */
export function formatNumber(value: number, maxFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—'
  const digits = Math.min(10, Math.max(0, Math.trunc(maxFractionDigits)))
  const rounded = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value
  return new Intl.NumberFormat(useLocale.getState().locale, {
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(rounded)
}
