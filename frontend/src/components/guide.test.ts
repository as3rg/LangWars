import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageGuide } from './LanguageGuide'
import { TaskDictionary } from './TaskDictionary'
import { useLocale } from '@/lib/i18n'

afterEach(() => useLocale.setState({ locale: 'en' }))

describe('language help', () => {
  it.each(['en', 'ru'] as const)('teaches the shared world progressively in %s without hiding the guide', (locale) => {
    useLocale.setState({ locale })
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(LanguageGuide)))
    expect(html).toContain(locale === 'en' ? 'All names are global' : 'Все имена глобальные')
    expect(html).toContain('let shared = 10;')
    expect(html).toContain('let shared = 99;')
    expect(html).toContain('__builtin_eq__')
    expect(html).not.toContain('<details')
  })
  it('leaves task words visible in the collapsed disclosure and preserves identifiers across languages', () => {
    useLocale.setState({ locale: 'ru' })
    const html = renderToStaticMarkup(createElement(TaskDictionary, { words: ['cat', 'dog', '<invalid>'] }))
    expect(html).toContain('В этой задаче разрешены только эти имена:')
    expect(html).toMatch(/<summary><span class="dictionary-preview mono muted">cat, dog, &lt;invalid&gt;<\/span>/)
    expect(html).toContain('Показать все')
    expect(renderToStaticMarkup(createElement(TaskDictionary, { words: [] }))).toBe('')
  })
})
