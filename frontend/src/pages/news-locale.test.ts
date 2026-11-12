import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLocale, t } from '@/lib/i18n'
import { NewsPage, newsCtaLabel } from './NewsPage'

vi.mock('@/api/hooks', () => ({
  useNews: () => ({ data: [
    { id: 'hero', pinned: true, title: 'Authored русский title', body: 'Authored русский body', category: 'event', createdAt: '2026-11-11T12:00:00Z', cta: { href: '/tasks', label: 'посмотреть' } },
    { id: 'feed', pinned: false, title: 'Feed title', body: 'Body', category: 'update', createdAt: '2026-11-11T12:00:00Z', cta: { href: '/world', label: 'Посмотреть' } },
  ] }),
  useTasks: () => ({ data: [] }),
}))

afterEach(() => useLocale.setState({ locale: 'en' }))

describe('home page control labels', () => {
  it.each(['en', 'ru'] as const)('localizes generic pinned and feed CTAs in %s while retaining authored content', (locale) => {
    useLocale.setState({ locale })
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(NewsPage)))
    expect(html).toContain(locale === 'en' ? 'View' : 'Посмотреть')
    if (locale === 'en') expect(html).not.toMatch(/посмотреть/i)
    expect(html).toContain('Authored русский title')
    expect(newsCtaLabel('My custom label')).toBe('My custom label')
    expect(newsCtaLabel('View')).toBe(locale === 'en' ? 'View' : 'Посмотреть')
  })

  it('localizes a live comparison-limit error with authoritative counts', () => {
    useLocale.setState({ locale: 'ru' })
    expect(t('Submissions are paused: solution comparisons are full (32/32). Try again shortly.')).toContain('заполнен (32/32)')
  })
})
