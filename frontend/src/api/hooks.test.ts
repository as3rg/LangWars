import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useAllSubmissions, useRating, useSubmissionDetail, useSubmissionRechecks, useTask, useTaskSubmissions, useTasks } from './hooks'
import { useAuthStore } from '@/store/auth'
import { useLocale } from '@/lib/i18n'
import type { User } from './types'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({})), useInfiniteQuery: vi.fn(() => ({})),
  useMutation: vi.fn(), useQueryClient: vi.fn(),
}))
// SSR uses Zustand's initial hydration snapshot. Read the live store here so
// consecutive renders model the account changes performed by a running client.
vi.mock('@/store/auth', async (original) => {
  const actual = await original<typeof import('@/store/auth')>()
  const read = (selector: (state: ReturnType<typeof actual.useAuthStore.getState>) => unknown) => selector(actual.useAuthStore.getState())
  return { ...actual, useAuthStore: Object.assign(read, actual.useAuthStore) }
})

function Capture() {
  useTasks(); useTask('sum'); useSubmissionDetail('private');
  useTaskSubmissions('sum', 'mine'); useAllSubmissions(); useRating('global');
  useSubmissionRechecks('private', 'caused', true)
  return null
}
function keys() {
  vi.mocked(useQuery).mockClear(); vi.mocked(useInfiniteQuery).mockClear()
  renderToStaticMarkup(createElement(Capture))
  return [...vi.mocked(useQuery).mock.calls, ...vi.mocked(useInfiniteQuery).mock.calls].map(([options]) => options.queryKey)
}
function session(token: string | null, role: User['role'] = 'user') {
  useAuthStore.setState({ token, user: token ? { id: token, role } as User : null })
}
afterEach(() => { session(null); useLocale.setState({ locale: 'en' }); vi.clearAllMocks() })

describe('account-specific query data', () => {
  it('never reuses private source, own submissions, budgets or me rows from a previous session', () => {
    session('first'); const first = keys()
    session(null); const guest = keys()
    session('second'); const second = keys()
    first.forEach((key, index) => {
      expect(second[index]).not.toEqual(key)
      expect(guest[index]).not.toEqual(key)
      // Prefix invalidations still refresh every session variant.
      expect(second[index][0]).toBe(key[0])
    })
  })
  it('drops privileged submission data on a role change but retains keys when only locale changes', () => {
    session('same', 'admin'); const admin = keys()
    session('same', 'user'); const player = keys()
    for (const index of [2, 3, 4, 6]) expect(player[index]).not.toEqual(admin[index])
    useLocale.setState({ locale: 'ru' })
    expect(keys()).toEqual(player)
  })
})
