import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, tokenStore } from './client'

const result = { status: 'OK', tests: [], stdout: '' }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  vi.useFakeTimers()
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) })
  tokenStore.set('session-one')
})

describe('submission history', () => {
  it('sends both cursor fields so submissions sharing a timestamp remain reachable', async () => {
    const fetch = vi.fn().mockResolvedValue(json([]))
    vi.stubGlobal('fetch', fetch)
    await api.adminSubmissions({ beforeCreated: '2026-11-10T16:00:00.000Z', beforeId: 'sub_example' })
    const url = new URL(fetch.mock.calls[0][0], 'http://localhost')
    expect(url.pathname).toBe('/api/admin/submissions')
    expect(url.searchParams.get('beforeCreated')).toBe('2026-11-10T16:00:00.000Z')
    expect(url.searchParams.get('beforeId')).toBe('sub_example')
    expect(url.searchParams.get('limit')).toBe('100')
  })
})

describe('registration and invitations', () => {
  it('sends only the username, password and invitation when registering', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ token: 'token', user: {} }, 201))
    vi.stubGlobal('fetch', fetch)
    await api.register('player', 'a-long-password', 'invite_token')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ username: 'player', password: 'a-long-password', inviteCode: 'invite_token' })
  })
  it('requests a bounded reusable invitation with an explicit expiration', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ code: 'new_token' }, 201))
    vi.stubGlobal('fetch', fetch)
    await api.createInvite({ maxUses: 150, expiresInHours: 24 })
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ maxUses: 150, expiresInHours: 24 })
  })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('queued execution', () => {
  it('keeps polling queued and running jobs until a completed result arrives', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ jobId: 'job-one' }, 202)).mockResolvedValueOnce(json({ status: 'queued' })).mockResolvedValueOnce(json({ status: 'running' })).mockResolvedValueOnce(json({ status: 'completed', result }))
    vi.stubGlobal('fetch', fetch)
    const pending = api.run('task-one', '@solution fn answer() { return 1; }', 'v0.3')
    await vi.advanceTimersByTimeAsync(2700)
    await expect(pending).resolves.toEqual(result)
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/api/tasks/task-one/run', '/api/jobs/job-one', '/api/jobs/job-one', '/api/jobs/job-one'])
    expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer session-one')
  })
  it('presents a failed worker error without resubmitting the code', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ jobId: 'job-one' }, 202)).mockResolvedValueOnce(json({ status: 'failed', error: { code: 'CONTRACT', message: 'Variable answer violates @eq' } }))
    vi.stubGlobal('fetch', fetch)
    const pending = api.run('task-one', '', 'v0.3')
    const rejected = expect(pending).rejects.toMatchObject({ code: 'CONTRACT', message: 'Variable answer violates @eq' })
    await vi.advanceTimersByTimeAsync(900)
    await rejected
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('stops polling if the player signs out or switches accounts', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ jobId: 'job-one' }, 202))
    vi.stubGlobal('fetch', fetch)
    const pending = api.run('task-one', '', 'v0.3')
    const rejected = expect(pending).rejects.toMatchObject({ code: 'SESSION_CHANGED' })
    tokenStore.set(null)
    await vi.advanceTimersByTimeAsync(900)
    await rejected
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('aborts a server request that never responds', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))))
    const pending = api.tasks()
    const rejected = expect(pending).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' })
    await vi.advanceTimersByTimeAsync(20_000)
    await rejected
  })
})
