import { t, useLocale } from '@/lib/i18n'
import { useInsights } from '@/api/hooks'
import type { SubmissionSummary, Task } from '@/api/types'
import { CatMascot } from '@/components/CatMascot'
import {
  EmptyState,
  ErrorNotice,
  Loading,
  Panel,
  StatusPill,
} from '@/components/ui'
import { formatDuration, formatRelative } from '@/lib/time'
import { formatNumber } from '@/lib/numbers'

interface StatsData {
  taskTitle: string
  totalSubmissions: number
  uniqueCats: number
  solvedCats: number
  solveRate: number
  averageAttempts: number
  fastestMs: number
  statusBreakdown: Record<string, number>
  topCats: Array<{ userId: string; username: string; attempts: number; solved: boolean }>
  recent: SubmissionSummary[]
}

export function CatStatsPage({ task }: { task: Task }) {
  useLocale()
  const query = useInsights(task.id, true)

  if (query.isLoading) return <Loading label={t("gathering cat stats…")} />
  if (query.error) return <ErrorNotice message={t("Could not load insights.")} />
  if (!query.data) return null

  const data = query.data.data as unknown as StatsData
  const breakdown = Object.entries(data.statusBreakdown ?? {})
  const maxCount = Math.max(1, ...breakdown.map(([, value]) => value))

  return (
    <div className="stack">
      <Panel className="panel-pad" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <CatMascot size={82} mood={data.solvedCats > 0 ? 'happy' : 'idle'} />
        <div>
          <div className="eyebrow">{t("custom task page · ")}{task.title}</div>
          <h3 style={{ fontSize: 22, margin: '6px 0' }}>{t("Cat Stats")}</h3>

        </div>
      </Panel>

      {data.totalSubmissions === 0 ? (
        <EmptyState title={t("No submissions yet")}>{t("This event is waiting for its first cat.")}</EmptyState>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-label">{t("Submissions")}</div>
              <div className="value">{data.totalSubmissions}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{t("Unique cats")}</div>
              <div className="value">{data.uniqueCats}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{t("Solved cats")}</div>
              <div className="value">{data.solvedCats}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{t("Solve rate")}</div>
              <div className="value">{Math.round((data.solveRate ?? 0) * 100)}%</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{t("Avg attempts")}</div>
              <div className="value">{formatNumber(data.averageAttempts)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{t("Fastest solve")}</div>
              <div className="value">{data.fastestMs ? formatDuration(data.fastestMs) : '—'}</div>
            </div>
          </div>

          <div className="admin-columns">
            <Panel className="panel-pad">
              <div className="eyebrow">{t("verdict breakdown")}</div>
              <div className="bar-list" style={{ marginTop: 14 }}>
                {breakdown.map(([status, count]) => (
                  <div className="bar-row" key={status}>
                    <span>{status}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.round((count / maxCount) * 100)}%`,
                          background:
                            status === 'OK'
                              ? 'linear-gradient(90deg, #0ff1ca, #8a5cf6)'
                              : 'linear-gradient(90deg, #ff2e88, #8a5cf6)',
                        }}
                      />
                    </div>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="panel-pad">
              <div className="eyebrow">{t("top cats")}</div>
              <div className="stack" style={{ marginTop: 12, gap: 8 }}>
                {data.topCats.map((cat) => (
                  <div className="row-between" key={cat.userId}>
                    <span className="mono" style={{ fontSize: 12.5 }}>
                      {cat.username} {cat.solved && <span className="solved-check">{t("solved")}</span>}
                    </span>
                    <span className="mono dim" style={{ fontSize: 11.5 }}>
                      {cat.attempts} {t("attempts")}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel className="panel-pad">
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              {t("recent submissions")}</div>
            <div className="stack" style={{ gap: 8 }}>
              {data.recent.map((submission) => (
                <div className="row-between wrap" key={submission.id}>
                  <span className="row" style={{ gap: 10 }}>
                    <StatusPill status={submission.status} />
                    <span className="mono" style={{ fontSize: 12.5 }}>
                      {submission.username}
                    </span>
                  </span>
                  <span className="mono dim" style={{ fontSize: 11.5 }}>
                    {formatNumber(submission.score)} {t("pts · ")}{submission.testsPassed}/{submission.testsTotal} {t("tests ·")}{' '}
                    {formatRelative(submission.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}
