import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRating, useRatingTables, useTasks } from '@/api/hooks'
import { RatingPage } from '@/pages/RatingPage'
import { useLocale } from '@/lib/i18n'

vi.mock('@/api/hooks', () => ({ useRating: vi.fn(), useRatingTables: vi.fn(), useTasks: vi.fn() }))

afterEach(() => { useLocale.setState({ locale: 'en' }); vi.clearAllMocks() })

describe('rating presentation', () => {
  it.each([
    ['en', 'A shared sum', 'All tasks', 'Points', 'Solved'],
    ['ru', 'Общая сумма', 'Все задачи', 'Очки', 'Решено'],
  ] as const)('shows task ladders and one points/solved pair in %s', (locale, title, global, points, solved) => {
    useLocale.setState({ locale })
    const player = { userId: 'player', username: 'News', rank: 2, score: 50, solved: 1, extra: {} }
    vi.mocked(useRatingTables).mockReturnValue({ data: [
      { id: 'global', title: 'World ranking', columns: [] },
      { id: 'task:shared-sum', title: 'A shared sum', columns: [] },
    ] } as unknown as ReturnType<typeof useRatingTables>)
    vi.mocked(useTasks).mockReturnValue({ data: [{ id: 'shared-sum', title }] } as unknown as ReturnType<typeof useTasks>)
    // Legacy server descriptors listed fixed columns again. They must not duplicate.
    vi.mocked(useRating).mockReturnValue({ data: {
      descriptor: { id: 'global', title: 'World ranking', columns: [
        { key: 'score', label: 'Score' }, { key: 'solved', label: 'Solved' },
      ] }, rows: [player], me: player,
    } } as unknown as ReturnType<typeof useRating>)
    const html = renderToStaticMarkup(createElement(RatingPage))
    expect(html).toContain('value="task:shared-sum"')
    expect(html).toContain(title)
    expect(html).toContain(global)
    const headers = Array.from(html.matchAll(/<th(?:\s[^>]*)?>(.*?)<\/th>/g), (match) => match[1])
    expect(headers).toEqual(['#', locale === 'ru' ? 'Игрок' : 'Player', points, solved])
    expect(html).not.toContain('Δ')
    expect(html).toContain('me-row')
    // Application labels are translated; a player's identical login stays intact.
    expect(html).toContain('News')
  })
})
