import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuery } from '@tanstack/react-query'
import { PerformancePanel, PerformanceView } from './PerformancePanel'
import type { PerformanceSnapshot } from '@/api/types'
import { useLocale } from '@/lib/i18n'

const state = vi.hoisted(() => ({ session: { token: 'session-one' as string | null, isAdmin: true, user: { role: 'admin' } }, query: {} as Record<string, unknown> }))
vi.mock('@/api/hooks', () => ({ useSession: () => state.session }))
vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn(() => state.query) }))

function snapshot(): PerformanceSnapshot {
  return {
    generatedAt: '2026-11-11T12:00:00Z', windowSeconds: 300, heartbeatSeconds: 10, staleAfterSeconds: 35,
    workers: { online: 0, busy: 0, stale: 0, items: [] },
    queue: { queued: 0, running: 0, expired: 0, capacity: 10, foregroundQueued: 0, foregroundRunning: 0, admissionUsed: 0, meanWaitSeconds: null, oldestWaitSeconds: null, byMode: [] },
    activity: { completed: 0, failed: 0, perMinute: 0, meanWaitMs: null, p95WaitMs: null, meanExecutionMs: null, p95ExecutionMs: null, byMode: [] },
    admission: { runAllowed: true, submitAllowed: true, reasons: [] },
    audits: { pending: 0, remainingCandidates: 0, capacity: 32, oldestPendingSeconds: null },
    api: { processId: 7, uptimeSeconds: 20, windowSeconds: 60, requests: 0, errors: 0, rejected: 0, rateLimited: 0, queueFull: 0, notificationBacklog: 0, cooldowns: 0, requestsPerSecond: 0, runsAccepted: 0, submissionsAccepted: 0, admissionsPerSecond: 0, meanLatencyMs: null, p95LatencyMs: null, inFlight: 0 },
    store: { probeMs: 1.0000000004 },
  }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-11T12:00:01Z')); state.session = { token: 'session-one', isAdmin: true, user: { role: 'admin' } }; state.query = {} })
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); useLocale.setState({ locale: 'en' }) })

describe('performance overview', () => {
  it.each([
    ['en', 'No workers online. Jobs will wait in the queue.', 'No jobs in this window.', 'Workers'],
    ['ru', 'Нет активных воркеров. Задания будут ждать в очереди.', 'За этот период заданий нет.', 'Воркеры'],
  ] as const)('does not fabricate latency or worker availability in an empty %s installation', (locale, warning, empty, workers) => {
    useLocale.setState({ locale })
    const html = renderToStaticMarkup(createElement(PerformanceView, { data: snapshot() }))
    expect(html).toContain(warning)
    expect(html).toContain(empty)
    expect(html).toContain(workers)
    expect(html).toContain('p95 ≈ —')
    expect(html).not.toContain('NaN')
    expect(html).not.toContain('1.0000000004')
  })

  it('separates foreground capacity from background fan-out and shows approximate timings and offline workers', () => {
    useLocale.setState({ locale: 'en' })
    const data = snapshot()
    data.queue = { ...data.queue, admissionUsed: 10, foregroundQueued: 9, foregroundRunning: 1, queued: 50, running: 2, meanWaitSeconds: 30, oldestWaitSeconds: 42, byMode: [{ mode: 'break_audit', queued: 41, running: 1, meanWaitSeconds: 30, oldestWaitSeconds: 42 }] }
    data.admission = { runAllowed: false, submitAllowed: false, reasons: ['QUEUE_FULL'] }
    data.activity = { ...data.activity, completed: 75, perMinute: 15, meanWaitMs: 1500, p95WaitMs: 4000, byMode: [{ mode: 'break_audit', completed: 10, failed: 0, perMinute: 2, meanWaitMs: 1500, p95WaitMs: 4000, meanExecutionMs: 10.000000004, p95ExecutionMs: 20 }] }
    data.workers = { online: 1, busy: 1, stale: 1, items: [
      { id: 'one', hostname: '<worker-one>', pid: 8, lastSeen: data.generatedAt, state: 'busy', mode: 'submit', busySeconds: 2, utilizationPercent: 98.000000004 },
      { id: 'two', hostname: 'worker-two', pid: 9, lastSeen: '2026-11-11T11:59:00Z', state: 'offline', mode: 'run', utilizationPercent: 100 },
    ] }
    const html = renderToStaticMarkup(createElement(PerformanceView, { data }))
    expect(html).toContain('10 / 10')
    expect(html).not.toContain('52 / 10')
    expect(html).toContain('queue is full')
    expect(html).toContain('50 queued · 2 running')
    expect(html).toContain('p95 ≈ 4 s')
    expect(html).toContain('Queue age')
    expect(html).toContain('30 s')
    expect(html).toContain('98%')
    expect(html).not.toContain('100%')
    expect(html).toContain('performance-offline')
    expect(html).toContain('Causal check')
    expect(html).toContain('&lt;worker-one&gt;')
    expect(html).not.toContain('10.000000004')
  })

  it('polls only an administrator session and preserves prefix invalidations without hidden-page polling', () => {
    renderToStaticMarkup(createElement(PerformancePanel))
    let options = vi.mocked(useQuery).mock.calls.at(-1)![0]
    expect(options.queryKey).toEqual(['admin', 'performance', 'session-one', 'admin'])
    expect(options.refetchInterval).toBe(10000)
    expect(options.refetchIntervalInBackground).toBe(false)
    expect(options.retry).toBe(false)
    state.session = { token: 'session-two', isAdmin: false, user: { role: 'user' } }
    renderToStaticMarkup(createElement(PerformancePanel))
    options = vi.mocked(useQuery).mock.calls.at(-1)![0]
    expect(options.queryKey).toEqual(['admin', 'performance', 'session-two', 'user'])
    expect(options.enabled).toBe(false)
  })

  it.each(['en', 'ru'] as const)('shows the independent Submit gate while foreground slots remain free in %s', (locale) => {
    useLocale.setState({ locale })
    const data = snapshot()
    data.queue = { ...data.queue, admissionUsed: 3, capacity: 300, foregroundQueued: 3, queued: 35 }
    data.admission = { runAllowed: true, submitAllowed: false, reasons: ['NOTIFICATION_BACKLOG'] }
    data.audits = { pending: 32, capacity: 32, remainingCandidates: 2295, oldestPendingSeconds: 201 }
    const html = renderToStaticMarkup(createElement(PerformanceView, { data }))
    expect(html).toContain('3 / 300')
    expect(html).toContain(locale === 'en' ? 'Submit is paused' : 'Приём посылок приостановлен')
    expect(html).toContain('(32/32)')
    expect(html).toContain(locale === 'en' ? 'Sample run · Available' : 'Проверка примеров · Доступно')
    expect(html).not.toContain('queue is full')
  })

  it('keeps the last snapshot visibly stale on a refresh error', () => {
    useLocale.setState({ locale: 'en' })
    state.query = { data: snapshot(), isError: true, error: new Error('offline'), refetch: vi.fn() }
    const html = renderToStaticMarkup(createElement(PerformancePanel))
    expect(html).toContain('Could not refresh performance data.')
    expect(html).toContain('Stale data')
    expect(html).toContain('API · PID 7')
  })

  it('shows overflow percentiles as a lower bound rather than an invented upper bound', () => {
    useLocale.setState({ locale: 'en' })
    const data = snapshot()
    data.activity.p95WaitMs = 604800000
    data.activity.p95WaitCapped = true
    const html = renderToStaticMarkup(createElement(PerformanceView, { data }))
    expect(html).toContain('p95 ≥ 7 d')
    expect(html).toContain('shown as a lower bound')
    expect(html).not.toContain('p95 ≈ 7 d')
  })
})
