import { t, useLocale } from '@/lib/i18n'
import { BreakImpactBadge } from './BreakImpact'
import { useEffect, useRef, useState } from 'react'
import { Check, Clipboard, X } from 'lucide-react'
import { useSubmissionDetail } from '@/api/hooks'
import { ApiError } from '@/api/client'
import { formatDuration, formatDateTime } from '@/lib/time'
import { DiffView } from './DiffView'
import { DiagnosticList } from './DiagnosticList'
import { EmptyState, ErrorNotice, GlowButton, Loading, StatusPill } from './ui'
import { toast } from '@/store/ui'

export function SubmissionModal({ id, onClose }: { id: string; onClose: () => void }) {
  useLocale()
  const detail = useSubmissionDetail(id)
  const [tab, setTab] = useState<'code' | 'diff'>('code')
  const [copied, setCopied] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key === 'Tab') {
        const controls = modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')
        if (!controls?.length) return
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; previousFocus?.focus() }
  }, [])

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
      aria-label={t("Submission detail")}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal" ref={modalRef}>
        <div className="modal-head">
          <div>
            <h3>{t("Submission")}</h3>
            <div className="mono" style={{ fontSize: 11, color: 'var(--dim)' }}>
              {id}
            </div>
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label={t("Close")}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {detail.isLoading && <Loading label={t("fetching submission…")} />}
          {detail.error && (
            <ErrorNotice
              message={
                detail.error instanceof ApiError
                  ? `${detail.error.code}: ${detail.error.message}`
                  : t("Could not load submission")
              }
            />
          )}
          {detail.data && (
            <>
              <div className="row wrap" style={{ gap: 12 }}>
                <StatusPill status={detail.data.status} />
                {detail.data.breakImpact && <BreakImpactBadge impact={detail.data.breakImpact} />}
                <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {detail.data.score} {t("pts · ")}{detail.data.testsPassed}/{detail.data.testsTotal} {t("tests ·")}{' '}
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
                      <span>{test.passed ? t("passed") : t('Expected {expected}, got {actual}', { expected: test.expected, actual: test.actual ?? '?' })}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="tabs">
                <button className={tab === 'code' ? 'tab active' : 'tab'} onClick={() => setTab('code')}>
                  {t("Code")}</button>
                <button className={tab === 'diff' ? 'tab active' : 'tab'} onClick={() => setTab('diff')}>
                  {t("Diff ")}{detail.data.previousId ? '' : t("(first)")}
                </button>
              </div>

              {tab === "code" ? (
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
                <EmptyState title={t("No previous submission")}>
                  {t("This is the first recorded submission for this task.")}</EmptyState>
              )}

              {detail.data.diagnostics.length > 0 && (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>
                    {t("judge diagnostics")}</div>
                  <div className="problems-panel">
                    <DiagnosticList diagnostics={detail.data.diagnostics} code={detail.data.code} />
                  </div>
                </div>
              )}

              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <GlowButton size="sm" onClick={copy} icon={copied ? <Check size={13} /> : <Clipboard size={13} />}>
                  {t("Copy code")}</GlowButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
