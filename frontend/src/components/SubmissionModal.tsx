import { t, useLocale } from '@/lib/i18n'
import { BreakImpactBadge } from './BreakImpact'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Clipboard, X } from 'lucide-react'
import { useSession, useSubmissionDetail, useSubmissionRechecks } from '@/api/hooks'
import { ApiError } from '@/api/client'
import { formatDuration, formatDateTime } from '@/lib/time'
import { DiffView } from './DiffView'
import { DiagnosticList } from './DiagnosticList'
import { EmptyState, ErrorNotice, GlowButton, Loading, StatusPill } from './ui'
import { toast } from '@/store/ui'
import { submissionDiff } from '@/lib/submissionDiff'
import { formatNumber } from '@/lib/numbers'

export function RecheckHistory({ id, scope }: { id: string; scope: 'target' | 'caused' }) {
  const query = useSubmissionRechecks(id, scope, true)
  const items = [...new Map(query.data?.pages.flatMap((page) => page.items).map((run) => [run.id, run]) ?? []).values()]
  return <div className="recheck-history">
    {query.isLoading && <Loading label={t('Loading…')} />}
    {query.error && <ErrorNotice message={t('Could not load rechecks.')} />}
    {!query.isLoading && !query.error && !items.length && <EmptyState title={t('No rechecks yet.')} />}
    {items.map((run) => <article key={run.id} className="recheck-run">
      <div className="row-between wrap" style={{ gap: 8 }}>
        <span>{run.taskTitle}</span>
        {run.completed ? <StatusPill status={run.status} /> : <span className="badge badge-violet">{t('Unavailable')}</span>}
      </div>
      <div className="row wrap recheck-meta">
        <span>{t(run.kind === 'causal_before' ? 'Before change' : run.kind === 'causal_after' ? 'After change' : 'Live check')}</span>
        <span title={t('World version')}>v{run.worldVersion}</span>
        <time dateTime={run.finishedAt ?? run.createdAt}>{formatDateTime(run.finishedAt ?? run.createdAt)}</time>
        {run.completed && <span>{run.testsPassed}/{run.testsTotal} {t('tests ·')} {formatDuration(run.durationMs)}</span>}
      </div>
      <div className="recheck-ids">
        <span title={t('Submission')}>{run.submissionId}</span>
        {run.causeSubmissionId && <span title={t('Triggered by')}>← {run.causeSubmissionId}</span>}
      </div>
      {run.completed && (run.previousStatus || run.verdictStatus !== run.status) && <div className="recheck-meta">{run.previousStatus && <span>{run.previousStatus} → </span>}{run.verdictStatus}</div>}
      {run.diagnostics.length > 0 && <details className="recheck-diagnostics"><summary>{t('Diagnostics')}</summary>{run.diagnostics.map((diagnostic, index) => <div key={index}><code>{diagnostic.code}</code> · {diagnostic.message}</div>)}</details>}
    </article>)}
    {query.hasNextPage && <GlowButton size="sm" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{t('Load more')}</GlowButton>}
  </div>
}

export function SubmissionModal({ id, onClose }: { id: string; onClose: () => void }) {
  useLocale()
  const detail = useSubmissionDetail(id)
  const { user } = useSession()
  const admin = user?.role === 'admin'
  const [tab, setTab] = useState<'code' | 'diff' | 'rechecks' | 'triggered'>('code')
  const [copied, setCopied] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const diff = useMemo(() => detail.data?.diff?.hunks ?? (detail.data?.previousCode !== undefined ? submissionDiff(detail.data.previousCode, detail.data.code) : undefined), [detail.data])

  useEffect(() => { setTab('code'); setCopied(false); modalRef.current?.scrollTo?.({ top: 0 }) }, [id])

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key === 'Tab') {
        const controls = modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')
        if (!controls?.length) return
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (!modalRef.current?.contains(document.activeElement)) { event.preventDefault(); first.focus() }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }) }
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

  return createPortal((
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={t("Submission detail")}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal" ref={modalRef} tabIndex={-1}>
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
                  {formatNumber(detail.data.score)} {t("pts · ")}{detail.data.testsPassed}/{detail.data.testsTotal} {t("tests ·")}{' '}
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
                {admin && <>
                  <button className={tab === 'rechecks' ? 'tab active' : 'tab'} onClick={() => setTab('rechecks')}>{t('Rechecks')}</button>
                  <button className={tab === 'triggered' ? 'tab active' : 'tab'} onClick={() => setTab('triggered')}>{t('Triggered')}</button>
                </>}
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
              ) : admin && (tab === 'rechecks' || tab === 'triggered') ? (
                <RecheckHistory key={`${id}:${tab}`} id={id} scope={tab === 'rechecks' ? 'target' : 'caused'} />
              ) : diff ? (
                <DiffView hunks={diff} />
              ) : detail.data.previousCode !== undefined ? (
                <EmptyState title={t('Diff too large')}>{t('Compare the source with the previous submission.')}</EmptyState>
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
  ), document.body)
}
