import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import clsx from 'clsx'
import {
  ArrowLeft,
  ListChecks,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import type { RunResult, SubmitResult, SubmissionSummary, Task } from '@/api/types'
import { useRun, useSession, useSubmit, useTask, useTaskSubmissions } from '@/api/hooks'
import { ApiError } from '@/api/client'
import { isLangVersion, LATEST_VERSION, type LangVersion } from '@/lwlang'
import { LwEditor } from '@/editor/LwEditor'
import { Markdown } from '@/components/Markdown'
import { CatMascot } from '@/components/CatMascot'
import { RatingTablePanel } from '@/components/RatingTablePanel'
import { SubmissionModal } from '@/components/SubmissionModal'
import { BreakImpactBadge } from '@/components/BreakImpact'
import { TaskDictionary } from '@/components/TaskDictionary'
import {
  Badge,
  DifficultyBadge,
  EmptyState,
  ErrorNotice,
  GlowButton,
  LinkButton,
  Loading,
  Panel,
  ScorePill,
  StatusPill,
} from '@/components/ui'
import { formatRelative } from '@/lib/time'
import { formatNumber } from '@/lib/numbers'
import { plural } from '@/lib/plural'
import { toast } from '@/store/ui'
import { CustomTaskPage } from './custom/registry'
import { t, useLocale } from '@/lib/i18n'

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Request failed'
}

export function TaskPage() {
  useLocale()
  const { id } = useParams()
  const query = useTask(id)
  const { user } = useSession()

  if (query.isLoading) return <Loading label={t("opening task…")} />
  if (query.error) return <ErrorNotice message={t("Could not load this task.")} />
  if (!query.data) return null

  return <TaskWorkspace key={`${query.data.id}:${user?.id ?? 'guest'}`} task={query.data} />
}

type TabId = 'mine' | 'all' | 'rating' | string

function TaskWorkspace({ task }: { task: Task }) {
  useLocale()
  const queryClient = useQueryClient()
  const { user, isAdmin } = useSession()
  const version: LangVersion = isLangVersion(task.languageVersion) ? task.languageVersion : LATEST_VERSION
  const storageKey = `langwars.code.v2.${user?.id ?? 'guest'}.${task.id}`

  const [code, setCode] = useState(() => {
    try {
      return localStorage.getItem(storageKey) ?? task.starterCode
    } catch {
      return task.starterCode
    }
  })
  const [tab, setTab] = useState<TabId>('mine')
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [verdict, setVerdict] = useState<SubmitResult | null>(null)
  const [openSubmission, setOpenSubmission] = useState<string | null>(null)

  const [checked, setChecked] = useState<{ code: string; diagnostics: NonNullable<RunResult['diagnostics']> }>({ code: '', diagnostics: [] })
  const diagnostics = checked.code === code ? checked.diagnostics : []

  const run = useRun(task.id)
  const submit = useSubmit(task.id)
  const mine = useTaskSubmissions(task.id, 'mine')
  const all = useTaskSubmissions(task.id, 'all')

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, code)
    } catch {
      /* ignore quota errors */
    }
  }, [code, storageKey])

  const handleRun = () => {
    setVerdict(null)
    run.mutate(
      { code, version },
      {
        onSuccess: (result) => {
          setRunResult(result)
          setChecked({ code, diagnostics: result.diagnostics ?? [] })
        },
      },
    )
  }

  const handleSubmit = () => {
    const penalty = task.resubmitPenalty
    if (penalty?.enabled && penalty.points > 0 && !window.confirm(t('This task is already solved. Submitting again costs {points} points ({percent}%). Continue?', { points: penalty.points, percent: penalty.percent }))) return
    setRunResult(null)
    submit.mutate(
      { code, version, acceptResubmitPenalty: Boolean(penalty?.enabled && penalty.points > 0), expectedPenaltyPoints: penalty?.points },
      {
        onSuccess: (result) => {
          setVerdict(result)
          setChecked({ code, diagnostics: result.submission.diagnostics ?? [] })
          // The server notification feed owns verdict popups and their history.
        },
        onError: (error) => { if (error instanceof ApiError && error.code === 'PENALTY_CONFIRMATION_REQUIRED') queryTaskRefresh(); toast('error', messageOf(error)) },
      },
    )
  }

  const queryTaskRefresh = () => { queryClient.invalidateQueries({ queryKey: ['task', task.id] }); queryClient.invalidateQueries({ queryKey: ['config'] }) }

  const reset = () => {
    setCode(task.starterCode)
    setVerdict(null)
    setRunResult(null)
    toast('info', 'Editor reset to starter code.')
  }

  const customPages = task.customPages ?? []
  const activeCustom = customPages.find((page) => page.id === tab)

  return (
    <div>
      <div className="crumbs">
        <Link to="/tasks" className="row" style={{ gap: 5 }}>
          <ArrowLeft size={12} /> {t("tasks")}</Link>
        <span>/</span>
        <span>{task.slug}</span>
      </div>

      <div className="task-head">
        <div>
          <div className="row wrap" style={{ gap: 8 }}>
            <DifficultyBadge difficulty={task.difficulty} />
            <ScorePill score={task.score} />
            <Badge tone="violet">{task.languageVersion}</Badge>
            {task.ratingTable && <Badge tone="amber">{t("event task")}</Badge>}
            {task.broken && !task.solved && <Badge tone="magenta">{t('Broken')}</Badge>}
          </div>
          <h1>{task.title}</h1>
          <div className="task-meta-row">
            <span>
              <Users size={12} style={{ verticalAlign: '-1px' }} /> {plural(task.solvedBy, "solve")}
            </span>
            {task.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <GlowButton size="sm" onClick={reset} icon={<RotateCcw size={13} />}>
            {t("Reset code")}</GlowButton>
          <LinkButton to="/rating" size="sm" icon={<Trophy size={13} />}>
            {t("Rating")}</LinkButton>
        </div>
      </div>

      <div className="task-layout">
        <Panel className="statement-panel">
          <Markdown text={task.statement} />

          <h3 style={{ marginTop: 24, fontSize: 17 }}>{t("Examples")}</h3>
          <div style={{ marginTop: 10 }}>
            {task.examples.map((example, index) => (
              <div className="example" key={index}>
                <div className="example-head">{t("example ")}{index + 1}</div>
                <div className="example-body">
                  <div>
                    <span className="example-label">{t("input")}</span>
                    <span className="mono">{example.input}</span>
                  </div>
                  <div>
                    <span className="example-label">{t("output")}</span>
                    <span className="mono example-output">{example.output}</span>
                  </div>
                </div>
                {example.explanation && (
                  <div className="mono dim" style={{ fontSize: 11.5, padding: '0 12px 10px' }}>
                    {example.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 22, fontSize: 17 }}>{t("Constraints")}</h3>
          <ul className="constraints" style={{ marginTop: 10 }}>
            {task.constraints.map((constraint) => (
              <li key={constraint}>{constraint}</li>
            ))}
          </ul>

          <TaskDictionary words={task.allowedWords ?? []} />

          <p className="muted" style={{ marginTop: 20 }}>{t("Run checks the examples. Submit checks all tests and publishes changes when accepted. Time limit: ")}{task.timeLimitMs} {t("ms.")}</p>
          <p className="muted">{t("Use exactly one ")}<code>@solution</code> {t("function. Names and parameters are global; another player can change them later.")}</p>
          <Link to="/world">{t("Explore shared names and available words →")}</Link>
          <p><Link to="/guide">{t('LWLang guide')} →</Link></p>
        </Panel>

        <div className="workspace">
          {!user && (
            <div className="notice">
              <Link to="/auth">{t("Sign in")}</Link> {t("to run code and publish a solution.")}</div>
          )}

          {user && task.nameBudget && <div className="name-budget row wrap" role="status" style={{ gap: 16 }}>
            <span title={t('All names claimed by your account')}>{t('Names')} <strong>{formatNumber(task.nameBudget.used)} / {formatNumber(task.nameBudget.limit)}</strong></span>
            <span title={t('Names claimed by your accepted solutions for this task')}>{t('This task')} <strong>{formatNumber(task.nameBudget.taskUsed)} / {formatNumber(task.nameBudget.taskLimit)}</strong></span>
            <span>{t('Core overrides')} <strong>{formatNumber(task.nameBudget.coreUsed)} / {formatNumber(task.nameBudget.coreLimit)}</strong></span>
          </div>}

          <LwEditor
            code={code}
            onChange={setCode}
            version={version}
            addonPacks={task.addonPacks}
            diagnostics={diagnostics}
            onRun={user ? handleRun : undefined}
            onSubmit={user ? handleSubmit : undefined}
            running={run.isPending}
            submitting={submit.isPending}
          />

          {run.error && <ErrorNotice message={messageOf(run.error)} />}

          {user && task.resubmitPenalty?.enabled && task.resubmitPenalty.points > 0 && <div className="notice" role="status">{t('Already solved · resubmission costs {points} points ({percent}%). Runs are free.', { points: task.resubmitPenalty.points, percent: task.resubmitPenalty.percent })}</div>}

          {(run.isPending || submit.isPending) && <div className="notice" role="status">{submit.isPending ? t("Submission queued or running. Changes publish only after every check passes.") : t("Run queued or running…")}</div>}

          {runResult && (
            <Panel className="panel-pad">
              <div className="row-between wrap">
                <div className="row" style={{ gap: 10 }}>
                  <StatusPill status={runResult.status} />
                  <span className="mono dim" style={{ fontSize: 11.5 }}>
                    {t("example tests")}</span>
                </div>
                <button className="mono dim" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setRunResult(null)}>
                  {t("dismiss")}</button>
              </div>
              <div className="run-output">
                {runResult.tests.map((test, index) => (
                  <div className="test-row" key={index}>
                    <span className={`status-dot ${test.passed ? 'ok' : 'bad'}`} />
                    <span className="name">{test.name}</span>
                    <span className="mono dim">{test.input}</span>
                    {!test.passed && <span className="mono">{t("expected ")}{test.expected}{t("; got ")}{test.actual ?? t("no result")}</span>}
                    <span style={{ marginLeft: 'auto' }}>{test.passed ? t("passed") : t("failed")}</span>
                  </div>
                ))}
                {runResult.stdout && (
                  <pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>
                    {runResult.stdout}
                  </pre>
                )}
              </div>
            </Panel>
          )}

          {verdict && (
            <div
              className={clsx(
                'verdict-panel',
                verdict.submission.status === 'OK' ? 'verdict-ok' : 'verdict-bad',
              )}
            >
              <CatMascot
                size={64}
                mood={verdict.submission.status === 'OK' ? 'happy' : 'sad'}
                animated={false}
              />
              <div>
                <div className="verdict-title">
                  {verdict.submission.status === "OK" ? t("ACCEPTED") : t("NOT ACCEPTED")}
                </div>
                <div className="verdict-stats" style={{ marginTop: 8 }}>
                  <span>
                    {t("score ")}<strong>{formatNumber(verdict.submission.score)}</strong>
                  </span>
                  <span>
                    {t("tests")}{' '}
                    <strong>
                      {verdict.submission.testsPassed}/{verdict.submission.testsTotal}
                    </strong>
                  </span>
                  <span>
                    {t("rating")}{' '}
                    <strong
                      style={{
                        color: verdict.ratingUpdate.delta >= 0 ? 'var(--cyan)' : 'var(--magenta)',
                      }}
                    >
                      {verdict.ratingUpdate.delta >= 0
                        ? `+${formatNumber(verdict.ratingUpdate.delta)}`
                        : formatNumber(verdict.ratingUpdate.delta)}
                    </strong>
                  </span>
                  <span>
                    {t("rank ")}<strong>#{verdict.ratingUpdate.rank}</strong>{' '}
                    <span className="dim">{t("(was #")}{verdict.ratingUpdate.rankBefore})</span>
                  </span>
                </div>
              </div>
              <div className="verdict-actions">
                <GlowButton size="sm" onClick={() => setOpenSubmission(verdict.submission.id)}>
                  {t("View submission")}</GlowButton>
                <button
                  className="icon-btn"
                  aria-label={t("Dismiss verdict")}
                  onClick={() => setVerdict(null)}
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <Panel className="panel-pad">
            <div className="tabs">
              <button className={tab === 'mine' ? 'tab active' : 'tab'} onClick={() => setTab('mine')}>
                <ListChecks size={13} /> {t("My submissions")}</button>
              <button className={tab === 'all' ? 'tab active' : 'tab'} onClick={() => setTab('all')}>
                <Users size={13} /> {t("All submissions")}</button>
              <button className={tab === 'rating' ? 'tab active' : 'tab'} onClick={() => setTab('rating')}>
                <Trophy size={13} /> {t("Task rating")}</button>
              {task.ratingTable && (
                <button
                  className={tab === 'event' ? 'tab active' : 'tab'}
                  onClick={() => setTab('event')}
                >
                  <Sparkles size={13} /> {t("Event ladder")}</button>
              )}
              {customPages.map((page) => (
                <button
                  key={page.id}
                  className={tab === page.id ? 'tab active' : 'tab'}
                  onClick={() => setTab(page.id)}
                >
                  {page.title}
                </button>
              ))}
            </div>

            {tab === "mine" &&
              (user ? (
                <TaskSubmissions
                  query={mine}
                  currentUserId={user.id}
                  isAdmin={isAdmin}
                  onOpen={setOpenSubmission}
                  emptyTitle={t("No submissions yet")}
                  emptyBody={t("Run your code, then submit. The cat keeps receipts.")}
                />
              ) : (
                <EmptyState title={t("Sign in to see your submissions")}>
                  <Link to="/auth">{t("Sign in")}</Link>
                </EmptyState>
              ))}

            {tab === "all" &&
              (user ? (
                <TaskSubmissions
                  query={all}
                  currentUserId={user.id}
                  isAdmin={isAdmin}
                  onOpen={setOpenSubmission}
                  emptyTitle={t("No submissions for this task yet")}
                  emptyBody={t("Be the first cat on the board.")}
                />
              ) : (
                <EmptyState title={t("Sign in to see the submission log")}>
                  {t("Code stays private; the log does not.")}</EmptyState>
              ))}

            {tab === "rating" && <RatingTablePanel tableId={`task:${task.id}`} />}

            {tab === "event" && task.ratingTable && <RatingTablePanel tableId={task.ratingTable} />}

            {activeCustom && <CustomTaskPage task={task} kind={activeCustom.kind} />}
          </Panel>
        </div>
      </div>

      {openSubmission && <SubmissionModal id={openSubmission} onClose={() => setOpenSubmission(null)} />}
    </div>
  )
}

function TaskSubmissions({
  query,
  currentUserId,
  isAdmin,
  onOpen,
  emptyTitle,
  emptyBody,
}: {
  query: ReturnType<typeof useTaskSubmissions>
  currentUserId: string
  isAdmin: boolean
  onOpen: (id: string) => void
  emptyTitle: string
  emptyBody: string
}) {
  useLocale()
  if (query.isLoading) return <Loading label={t("loading submissions…")} />
  if (query.error) return <ErrorNotice message={t("Could not load submissions.")} />
  const items: SubmissionSummary[] = query.data ?? []
  const showImpact = items.some((submission) => submission.breakImpact !== undefined)
  if (items.length === 0) return <EmptyState title={emptyTitle}>{emptyBody}</EmptyState>

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("When")}</th>
            <th>{t("Cat")}</th>
            <th>{t("Status")}</th>
            {showImpact && <th>{t('Broke')}</th>}
            <th style={{ textAlign: 'right' }}>{t("Score")}</th>
            <th>{t("Tests")}</th>
            <th>{t("Time")}</th>
            <th>{t("Lang")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((submission) => {
            const canOpen = submission.userId === currentUserId || isAdmin
            return (
              <tr
                key={submission.id}
                className={clsx('submission-row', !canOpen && 'private', submission.active === false && 'submission-inactive')}
                onClick={() => onOpen(submission.id)}
              >
                <td className="mono-cell">{formatRelative(submission.createdAt)}</td>
                <td>
                  <span className="row" style={{ gap: 6 }}>
                    {submission.username}
                    {submission.userId === currentUserId && <span className="badge badge-cyan">{t("you")}</span>}
                  </span>
                </td>
                <td>
                  <StatusPill status={submission.status} />
                </td>
                {showImpact && <td><BreakImpactBadge impact={submission.breakImpact} /></td>}
                <td className="score-cell" style={{ textAlign: 'right' }}>
                  {formatNumber(submission.score)}
                </td>
                <td className="mono-cell">
                  {submission.testsPassed}/{submission.testsTotal}
                </td>
                <td className="mono-cell">{formatNumber(submission.durationMs)} {t("ms")}</td>
                <td className="mono-cell">{submission.languageVersion}</td>
                <td className="mono-cell dim">{canOpen ? <button className="filter-chip" onClick={(event) => { event.stopPropagation(); onOpen(submission.id) }}>{t("Open")}</button> : t("private")}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
