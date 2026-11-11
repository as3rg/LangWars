import { afterEach, describe, expect, it, vi } from 'vitest'
import { localizeTask, t, useLocale } from './i18n'
import { ru } from './ru'

afterEach(() => { useLocale.setState({ locale: 'en' }); vi.unstubAllGlobals() })

describe('locale selection', () => {
  it('persists a change and notifies views without replacing application state', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', { setItem: (key: string, value: string) => storage.set(key, value) })
    const listener = vi.fn()
    const unsubscribe = useLocale.subscribe(listener)
    useLocale.getState().setLocale('ru')
    expect(storage.get('langwars.locale')).toBe('ru')
    expect(listener).toHaveBeenCalledOnce()
    expect(t('Tasks')).toBe('Задачи')
    expect(t('Welcome back, {name}.', { name: 'News' })).toBe('С возвращением, News.')
    expect(Object.values(ru).every((value) => !value.includes('??') && !value.includes('\uFFFD'))).toBe(true)
    unsubscribe()
  })

  it('uses a translated task when available and preserves cached canonical data', () => {
    const task = Object.freeze({ id: 'sum', starterCode: '@solution fn answer() { return 0; }', title: 'Sum', statement: 'Add', translations: Object.freeze({ en: Object.freeze({ title: 'Sum', statement: 'Add', constraints: ['ints'] }), ru: Object.freeze({ title: 'Сумма', statement: 'Сложите', constraints: ['целые'] }) }) })
    expect(localizeTask(task, 'ru')).toMatchObject({ id: 'sum', title: 'Сумма', statement: 'Сложите', constraints: ['целые'], starterCode: task.starterCode })
    expect(task.title).toBe('Sum')
    expect(localizeTask(task, 'en').title).toBe('Sum')
  })

  it('falls back to the available language for Russian-only and English-only tasks', () => {
    const russianOnly = { title: 'Сумма', translations: { ru: { title: 'Сумма', statement: 'Сложите', constraints: [] } } }
    const englishOnly = { title: 'Sum', translations: { en: { title: 'Sum', statement: 'Add', constraints: [] } } }
    expect(localizeTask(russianOnly, 'en').title).toBe('Сумма')
    expect(localizeTask(englishOnly, 'ru').title).toBe('Sum')
    const legacy = { id: 'old', title: 'Legacy' }
    expect(localizeTask(legacy, 'ru')).toBe(legacy)
  })
})
