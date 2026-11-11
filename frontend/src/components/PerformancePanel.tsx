import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { api } from '@/api/client'
import type { PerformanceSnapshot } from '@/api/types'
import { useSession } from '@/api/hooks'
import { t, useLocale } from '@/lib/i18n'
import { formatNumber } from '@/lib/numbers'
import { formatDateTime, formatDuration, formatRelative } from '@/lib/time'
import { Badge, EmptyState, ErrorNotice, GlowButton, Loading, Panel } from './ui'

const MODE_LABELS: Record<string, string> = { run: 'Sample run', submit: 'Submission', recheck: 'Recheck', break_audit: 'Causal check', restore: 'Restore' }
const modeName = (mode: string | null) => mode ? t(MODE_LABELS[mode] ?? 'Unknown') : '—'
const duration = (ms: number | null | undefined) => {
  if (ms == null) return '—'
  for (const [unit, size] of [['{count} d', 86400000], ['{count} h', 3600000], ['{count} min', 60000]] as const) {
    if (ms >= size) return t(unit, { count: formatNumber(ms / size) })
  }
  return formatDuration(ms)
}
const percentile = (ms: number | null | undefined, capped = false) => `${capped ? '≥' : '≈'} ${duration(ms)}`
const seconds = (value: number | null | undefined) => value == null ? '—' : duration(value * 1000)
const p95Title = (capped = false) => t(capped ? 'Percentile exceeds the measurement histogram; shown as a lower bound.' : 'Approximate upper bound for 95% of measured jobs.')

function Metric({ label, value, children, title }: { label: string; value: ReactNode; children?: ReactNode; title?: string }) {
  return <Panel className="panel-pad performance-metric" title={title}><span className="muted">{t(label)}</span><strong>{value}</strong>{children && <span className="dim">{children}</span>}</Panel>
}

export function PerformanceView({ data, stale = false }: { data: PerformanceSnapshot; stale?: boolean }) {
  useLocale()
  const full = data.queue.admissionUsed >= data.queue.capacity
  const modes = [...new Set([...data.queue.byMode.map((row) => row.mode), ...data.activity.byMode.map((row) => row.mode)])]
  return <div className="stack">
    <div className="row-between wrap performance-timestamp"><span className="muted">{t('Last {minutes} min', { minutes: formatNumber(data.windowSeconds / 60) })}</span><span className="row" style={{ gap: 8 }}>{stale && <Badge tone="amber">{t('Stale data')}</Badge>}<time dateTime={data.generatedAt} title={formatDateTime(data.generatedAt)}>{t('Updated')} {formatRelative(data.generatedAt)}</time></span></div>
    {data.workers.online === 0 && <div className="notice performance-warning" role="status">{t('No workers online. Jobs will wait in the queue.')}</div>}
    {full && <div className="notice performance-warning" role="status">{t('The submission queue is full. New runs and submissions are temporarily rejected.')}</div>}
    <div className="performance-grid">
      <Metric label="Workers" value={`${formatNumber(data.workers.busy)} / ${formatNumber(data.workers.online)}`} title={t('Busy / online. Busy means processing a job, not CPU utilization.')}><span>{t('busy / online')}{data.workers.stale > 0 && ` · ${t('{count} offline', { count: data.workers.stale })}`}</span></Metric>
      <Metric label="Admission slots" value={`${formatNumber(data.queue.admissionUsed)} / ${formatNumber(data.queue.capacity)}`} title={t('Only player runs, submissions and restore jobs use these slots. Background checks have a separate backlog.')}><progress value={data.queue.admissionUsed} max={Math.max(1, data.queue.capacity)} aria-label={t('Admission slots')} />{t('{queued} queued · {running} running', { queued: formatNumber(data.queue.foregroundQueued), running: formatNumber(data.queue.foregroundRunning) })}</Metric>
      <Metric label="Queue wait" value={duration(data.activity.meanWaitMs)} title={t('Average time between enqueue and claim for processed jobs in this window.')}><span title={p95Title(data.activity.p95WaitCapped)}>p95 {percentile(data.activity.p95WaitMs, data.activity.p95WaitCapped)}</span><span className="performance-current-age" title={t('Elapsed waiting time of jobs still queued; not their remaining wait.')}>{t('Queue age')} {seconds(data.queue.meanWaitSeconds)} · {t('oldest')} {seconds(data.queue.oldestWaitSeconds)}</span></Metric>
      <Metric label="Throughput" value={t('{count} jobs/min', { count: formatNumber(data.activity.perMinute) })} title={t('Completed worker claims, including rechecks and comparison steps.')}><span>{t('{count} completed', { count: formatNumber(data.activity.completed) })} · {t('{count} errors', { count: formatNumber(data.activity.failed) })}</span></Metric>
    </div>
    <Panel className="panel-pad stack">
      <div className="row-between wrap" style={{ gap: 8 }}><span>{t('All jobs')} · {t('{queued} queued · {running} running', { queued: formatNumber(data.queue.queued), running: formatNumber(data.queue.running) })}</span><span className="muted" title={t('Pending exact before/after comparisons; one candidate may require two sandbox executions.')}>{t('Comparisons')} {formatNumber(data.audits.pending)} / {formatNumber(data.audits.capacity)} · {t('{count} candidates left', { count: formatNumber(data.audits.remainingCandidates) })}</span></div>
      {data.queue.expired > 0 && <div className="notice performance-warning">{t('{count} expired leases awaiting recovery', { count: data.queue.expired })}</div>}
      {!modes.length ? <EmptyState title={t('No jobs in this window.')} /> : <div className="table-wrap"><table className="data-table performance-table"><thead><tr><th>{t('Job')}</th><th>{t('Queued')}</th><th>{t('Running')}</th><th>{t('Oldest')}</th><th>{t('Wait')}</th><th title={p95Title()}>p95</th><th>{t('Execution')}</th><th title={p95Title()}>p95</th><th>{t('Completed')}</th><th title={t('Infrastructure failures. Wrong answers are completed jobs.')}>{t('Errors')}</th></tr></thead><tbody>{modes.map((mode) => {
        const queue = data.queue.byMode.find((row) => row.mode === mode)
        const activity = data.activity.byMode.find((row) => row.mode === mode)
        return <tr key={mode}><td>{modeName(mode)}</td><td>{formatNumber(queue?.queued ?? 0)}</td><td>{formatNumber(queue?.running ?? 0)}</td><td>{seconds(queue?.oldestWaitSeconds)}</td><td>{duration(activity?.meanWaitMs)}</td><td title={p95Title(activity?.p95WaitCapped)}>{percentile(activity?.p95WaitMs, activity?.p95WaitCapped)}</td><td>{duration(activity?.meanExecutionMs)}</td><td title={p95Title(activity?.p95ExecutionCapped)}>{percentile(activity?.p95ExecutionMs, activity?.p95ExecutionCapped)}</td><td>{formatNumber(activity?.completed ?? 0)}</td><td>{formatNumber(activity?.failed ?? 0)}</td></tr>
      })}</tbody></table></div>}
    </Panel>
    <Panel className="panel-pad stack">
      <div className="row-between wrap"><span>{t('Workers')}</span><span className="muted" title={t('A worker without a recent heartbeat is considered offline; this is independent of its job lease.')}>{t('Heartbeat {seconds} s · offline after {stale} s', { seconds: data.heartbeatSeconds, stale: data.staleAfterSeconds })}</span></div>
      {!data.workers.items.length ? <EmptyState title={t('No worker heartbeats yet.')} /> : <div className="table-wrap"><table className="data-table performance-table">
        <thead><tr><th>{t('Worker')}</th><th>{t('Status')}</th><th>{t('Job')}</th><th>{t('Load')}</th><th>{t('Elapsed')}</th><th>{t('Last seen')}</th></tr></thead>
        <tbody>{data.workers.items.map((worker) => <tr key={worker.id} className={worker.state === 'offline' ? 'performance-offline' : undefined}>
          <td className="mono-cell" title={worker.id}>{worker.hostname ?? worker.id.slice(0, 16)} · {worker.pid}</td>
          <td><Badge tone={worker.state === 'busy' ? 'amber' : worker.state === 'idle' ? 'cyan' : 'default'}>{t(worker.state === 'busy' ? 'Busy' : worker.state === 'idle' ? 'Idle' : 'Offline')}</Badge></td>
          <td>{modeName(worker.mode)}</td>
          <td title={t('Share of wall time spent processing jobs in the last heartbeat interval; not CPU usage.')}>{worker.state === 'offline' || worker.utilizationPercent == null ? '—' : `${formatNumber(worker.utilizationPercent)}%`}</td>
          <td>{worker.state === 'busy' ? seconds(worker.busySeconds) : '—'}</td>
          <td title={formatDateTime(worker.lastSeen)}>{formatRelative(worker.lastSeen)}</td>
        </tr>)}</tbody>
      </table></div>}
    </Panel>
    <Panel className="panel-pad performance-api" title={t('API counters describe this process over the last {seconds} seconds.', { seconds: data.api.windowSeconds })}>
      <span className="mono">API · PID {data.api.processId}</span>
      <span>{t('{count} req/s', { count: formatNumber(data.api.requestsPerSecond) })}</span>
      <span title={t('Accepted runs and submissions per minute in this API process.')}>{t('Admitted')} {t('{count} jobs/min', { count: formatNumber(data.api.admissionsPerSecond * 60) })}</span>
      <span>{t('In flight')} {formatNumber(data.api.inFlight)}</span>
      <span>{t('Latency')} {duration(data.api.meanLatencyMs)} · <span title={t('Approximate API latency percentile.')}>p95 ≈ {duration(data.api.p95LatencyMs)}</span></span>
      <span title={t('HTTP 5xx responses')}>5xx {formatNumber(data.api.errors)}</span>
      <span title={t('HTTP 429 responses')}>429 {formatNumber(data.api.rateLimited)}</span>
      <span title={t('Cooldown rejections in this API process over the last {seconds} seconds.', { seconds: data.api.windowSeconds })}>{t('Cooldowns')} {formatNumber(data.api.cooldowns)}</span>
      <span>{t('Queue full')} {formatNumber(data.api.queueFull)}</span>
      <span>{t('Comparison backlog')} {formatNumber(data.api.notificationBacklog)}</span>
      {data.store && <span title={t('SELECT 1 round trip on the existing connection; excludes connection setup and other queries.')}>DB {duration(data.store.probeMs)}</span>}
      <span>{t('Uptime')} {seconds(data.api.uptimeSeconds)}</span>
    </Panel>
  </div>
}

export function PerformancePanel() {
  useLocale()
  const { token, user, isAdmin } = useSession()
  const query = useQuery({ queryKey: ['admin', 'performance', token, user?.role], queryFn: api.performance, enabled: Boolean(token && isAdmin), retry: false, staleTime: 5000, refetchInterval: 10000, refetchIntervalInBackground: false })
  const stale = Boolean(query.data && (query.isError || Date.now() - Date.parse(query.data.generatedAt) > 30000))
  return <div className="stack">
    <div className="row-between"><span className="muted">{t('Refreshes every 10 seconds')}</span><GlowButton size="sm" icon={<RefreshCw size={13} />} loading={query.isFetching} onClick={() => query.refetch()}>{t('Refresh')}</GlowButton></div>
    {query.isLoading && <Loading />}
    {query.error && <ErrorNotice message={t('Could not refresh performance data.')} />}
    {query.data && <PerformanceView data={query.data} stale={stale} />}
  </div>
}
