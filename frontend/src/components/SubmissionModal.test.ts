import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createPortal } from 'react-dom'
import { RecheckHistory, SubmissionModal } from './SubmissionModal'
import { useLocale } from '@/lib/i18n'

const history = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))

vi.mock('react-dom', async (original) => ({ ...(await original<object>()), createPortal: vi.fn((children) => children) }))
vi.mock('@/api/hooks', () => ({
  useSession: () => ({ user: { role: 'player' } }),
  useSubmissionDetail: () => ({ isLoading: true }),
  useSubmissionRechecks: () => history.value,
}))

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('submission overlay', () => {
  it('mounts the dialog in the document body, outside its transformed header or bell owner', () => {
    const body = { tagName: 'BODY' }
    vi.stubGlobal('document', { body })
    const html = renderToStaticMarkup(createElement('header', { style: { transform: 'translateY(0)' } }, createElement(SubmissionModal, { id: 'sub-1', onClose: () => {} })))
    expect(createPortal).toHaveBeenCalledOnce()
    expect(vi.mocked(createPortal).mock.calls[0][1]).toBe(body)
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('class="modal" tabindex="-1"')
  })
  it('distinguishes historical verdicts and unavailable judge runs without claiming they are still pending', () => {
    useLocale.setState({ locale: 'en' })
    const common = { taskTitle: 'Sum', createdAt: '2026-11-11T12:00:00Z', submissionId: 'victim', causeSubmissionId: 'change', worldVersion: 7, diagnostics: [] }
    history.value = { data: { pages: [{ items: [
      { ...common, id: 'before', kind: 'causal_before', completed: true, status: 'OK', verdictStatus: 'OK', testsPassed: 2, testsTotal: 2, durationMs: 3.000000004 },
      { ...common, id: 'after', kind: 'causal_after', completed: true, status: 'BROKEN', verdictStatus: 'WA', previousStatus: 'OK', testsPassed: 1, testsTotal: 2, durationMs: 3 },
      { ...common, id: 'unavailable', kind: 'live', completed: false, status: 'FAIL', verdictStatus: 'UNAVAILABLE', diagnostics: [{ code: 'SANDBOX_UNAVAILABLE', message: '<secret>' }] },
    ] }] } }
    const html = renderToStaticMarkup(createElement(RecheckHistory, { id: 'change', scope: 'caused' }))
    expect(html).toContain('Before change')
    expect(html).toContain('After change')
    expect(html).toContain('Broken')
    expect(html).toContain('Unavailable')
    expect(html).not.toContain('Pending')
    expect(html).not.toContain('3.000000004')
    expect(html).toContain('victim')
    expect(html).toContain('change')
    expect(html).toContain('&lt;secret&gt;')
    expect(html).not.toContain('<secret>')
  })
})
