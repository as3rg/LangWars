import { afterEach, describe, expect, it } from 'vitest'
import { formatNumber } from './numbers'
import { useLocale } from './i18n'

afterEach(() => useLocale.setState({ locale: 'en' }))

describe('table numbers', () => {
  it('removes floating point noise without adding zeros to whole numbers', () => {
    useLocale.setState({ locale: 'en' })
    expect(formatNumber(3.0000000004)).toBe('3')
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
    expect(formatNumber(1234.5678)).toBe('1234.57')
    expect(formatNumber(-0.00001)).toBe('0')
    expect(formatNumber(Infinity)).toBe('—')
    expect(formatNumber(NaN)).toBe('—')
  })

  it('uses the chosen language for decimals and supports explicit precision', () => {
    useLocale.setState({ locale: 'ru' })
    expect(formatNumber(3.125)).toBe('3,13')
    expect(formatNumber(3.125, 1)).toBe('3,1')
    expect(formatNumber(7000)).toBe('7000')
  })
})
