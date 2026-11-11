import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageGuide, guideExamples } from './LanguageGuide'
import { GuideCode } from './GuideCode'
import { TaskDictionary } from './TaskDictionary'
import { useLocale } from '@/lib/i18n'

afterEach(() => useLocale.setState({ locale: 'en' }))

describe('language help', () => {
  it.each(['en', 'ru'] as const)('teaches the shared world progressively in %s without hiding the guide', (locale) => {
    useLocale.setState({ locale })
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(LanguageGuide)))
    const text = html.replace(/<[^>]+>/g, '')
    expect(html).toContain(locale === 'en' ? 'All names are global' : 'Все имена глобальные')
    expect(text).toContain('let shared = 10;')
    expect(text).toContain('let shared = 99;')
    expect(html).toContain('__builtin_eq__')
    expect(html).toContain('tok-keyword')
    expect(html).toContain(locale === 'en' ? 'Standard library' : 'Стандартная библиотека')
    expect(html).toContain(locale === 'en' ? 'Type specifiers' : 'Спецификаторы типов')
    expect(html).toContain('EF(r₀)')
    expect(html).toContain('@push_back')
    expect(html.indexOf(locale === 'en' ? 'Shared names' : 'Общие имена')).toBeLessThan(html.indexOf(locale === 'en' ? 'Operator contracts' : 'Контракты операций'))
    expect(html).not.toContain('<details')
  })
  it('keeps highlighted examples selectable and escapes string contents', () => {
    const html = renderToStaticMarkup(createElement(GuideCode, { source: 'let value = "<script>"; // comment' }))
    expect(html).toContain('tok-string')
    expect(html).toContain('tok-comment')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
    expect(guideExamples[0]).not.toContain('<int')
    expect(guideExamples[1]).not.toContain('<list')
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
