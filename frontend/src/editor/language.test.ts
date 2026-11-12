import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { createCompletions } from './language'
import { useLocale } from '@/lib/i18n'

describe('standard-operation completion', () => {
  it('does not advertise removed swap as a builtin', () => {
    const state = EditorState.create({ doc: 'sw' })
    const result = createCompletions('v0.3')(new CompletionContext(state, 2, true))
    expect(result?.options.some((option) => option.label === 'swap')).toBe(false)
    expect(result?.options.some((option) => option.label === 'set')).toBe(true)
  })

  it('keeps builtin escapes out of ordinary operation suggestions', () => {
    const state = EditorState.create({ doc: 'cont' })
    const result = createCompletions('v0.3')(new CompletionContext(state, 4, true))
    expect(result?.options.some((option) => option.label === 'contains')).toBe(true)
    expect(result?.options.some((option) => option.label === '__builtin_contains__')).toBe(false)
    // Administrators can still opt into the legacy annotation.
    expect(result?.options.some((option) => option.label === '@contains')).toBe(true)
  })

  it.each([
    ['en', 'Original membership test for strings, lists and dictionaries. Available only inside stdlib overrides.'],
    ['ru', 'Исходная проверка вхождения для строк, списков и словарей. Доступна только внутри переопределений стандартных операций.'],
  ] as const)('documents the contains escape signature and boundary in %s', (locale, description) => {
    const before = useLocale.getState().locale
    try {
      useLocale.setState({ locale })
      const state = EditorState.create({ doc: '__builtin_cont' })
      const result = createCompletions('v0.3')(new CompletionContext(state, state.doc.length, true))
      const completion = result?.options.find((option) => option.label === '__builtin_contains__')
      expect(completion?.detail).toBe('(container, value) → int')
      expect(completion?.info).toBe(description)
      expect(result?.options.find((option) => option.label === '@contains')?.detail).toBe(locale === 'en' ? 'Disabled by default' : 'По умолчанию отключено')
    } finally {
      useLocale.setState({ locale: before })
    }
  })
})
