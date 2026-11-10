import { useEffect, useState } from 'react'
import { Check, Clipboard, X } from 'lucide-react'
import { useSubmissionDetail } from '@/api/hooks'
import { ApiError } from '@/api/client'
import { formatDuration, formatDateTime } from '@/lib/time'
import { DiffView } from './DiffView'
import { DiagnosticList } from './DiagnosticList'
import { EmptyState, ErrorNotice, GlowButton, Loading, StatusPill } from './ui'
import { toast } from '@/store/ui'

export function SubmissionModal({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useSubmissionDetail(id)
  const [tab, setTab] = useState<'code' | 'diff'>('code')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copy = async () => {
    if (!detail.data) return
    try {
      await navigator.clipboard.writeText(detail.data.code)
      setCopied(true)
      toast('success', 'Code copied to clipboard')
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast('error', 'Clipboard is blocked in this browser')
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Submission detail"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <h3>Submission</h3>
            <div className="mono" style={{ fontSize: 11, color: 'var(--dim)' }}>
              {id}
            </div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {detail.isLoading && <Loading label="fetching submission…" />}
          {detail.error && (
            <ErrorNotice
              message={
                detail.error instanceof ApiError
                  ? `${detail.error.code}: ${detail.error.message}`
                  : 'Could not load submission'
              }
            />
          )}
          {detail.data && (
            <>
              <div className="row wrap" style={{ gap: 12 }}>
                <StatusPill status={detail.data.status} />
                <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {detail.data.score} pts · {detail.data.testsPassed}/{detail.data.testsTotal} tests ·{' '}
                  {formatDuration(detail.data.durationMs)} · {formatDateTime(detail.data.createdAt)}
                </span>
                <span className="badge badge-violet">{detail.data.languageVersion}</span>
              </div>

              {detail.data.tests.length > 0 && (
                <div className="run-output">
                  {detail.data.tests.map((test, index) => (
                    <div className="test-row" key={index}>
                      <span className={`status-dot ${test.passed ? 'ok' : 'bad'}`} />
                      <span className="name">{test.name}</span>
                      <span>{test.passed ? 'passed' : `expected ${test.expected}, got ${test.actual ?? '?'}`}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="tabs">
                <button className={tab === 'code' ? 'tab active' : 'tab'} onClick={() => setTab('code')}>
                  Code
                </button>
                <button className={tab === 'diff' ? 'tab active' : 'tab'} onClick={() => setTab('diff')}>
                  Diff {detail.data.previousId ? '' : '(first)'}
                </button>
              </div>

              {tab === 'code' ? (
                <pre className="code-block">
                  {detail.data.code.split('\n').map((line, index) => (
                    <div key={index}>
                      <span className="ln">{index + 1}</span>
                      {line || ' '}
                    </div>
                  ))}
                </pre>
              ) : detail.data.diff ? (
                <DiffView hunks={detail.data.diff.hunks} />
              ) : (
                <EmptyState title="No previous submission">
                  This is the first recorded submission for this task.
                </EmptyState>
              )}

              {detail.data.diagnostics.length > 0 && (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>
                    judge diagnostics
                  </div>
                  <div className="problems-panel">
                    <DiagnosticList diagnostics={detail.data.diagnostics} code={detail.data.code} />
                  </div>
                </div>
              )}

              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <GlowButton size="sm" onClick={copy} icon={copied ? <Check size={13} /> : <Clipboard size={13} />}>
                  Copy code
                </GlowButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
