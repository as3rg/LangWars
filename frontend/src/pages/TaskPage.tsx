import { useEffect, useMemo, useState } from 'react'
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
import { analyze, isLangVersion, LATEST_VERSION, type LangVersion } from '@/lwlang'
import { LwEditor } from '@/editor/LwEditor'
import { Markdown } from '@/components/Markdown'
import { CatMascot } from '@/components/CatMascot'
import { RatingTablePanel } from '@/components/RatingTablePanel'
import { SubmissionModal } from '@/components/SubmissionModal'
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
import { plural } from '@/lib/plural'
import { toast } from '@/store/ui'
import { CustomTaskPage } from './custom/registry'

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Request failed'
}

export function TaskPage() {
  const { id } = useParams()
  const query = useTask(id)

  if (query.isLoading) return <Loading label="opening task…" />
  if (query.error) return <ErrorNotice message="Could not load this task." />
  if (!query.data) return null

  return <TaskWorkspace key={query.data.id} task={query.data} />
}

type TabId = 'mine' | 'all' | 'rating' | string

function TaskWorkspace({ task }: { task: Task }) {
  const { user, isAdmin } = useSession()
  const version: LangVersion = isLangVersion(task.languageVersion) ? task.languageVersion : LATEST_VERSION
  const storageKey = `langwars.code.${task.id}`

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

  const analysis = useMemo(
    () => analyze(code, version, task.addonPacks),
    [code, version, task.addonPacks],
  )

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
          toast(result.status === 'OK' ? 'success' : 'info', `Sample run: ${result.status}`)
        },
        onError: (error) => toast('error', messageOf(error)),
      },
    )
  }

  const handleSubmit = () => {
    setRunResult(null)
    submit.mutate(
      { code, version },
      {
        onSuccess: (result) => {
          setVerdict(result)
          toast(
            result.submission.status === 'OK' ? 'success' : 'error',
            result.submission.status === 'OK'
              ? `Accepted! +${result.ratingUpdate.delta} rating`
              : `Verdict: ${result.submission.status}. Mochi believes in you.`,
          )
        },
        onError: (error) => toast('error', messageOf(error)),
      },
    )
  }

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
          <ArrowLeft size={12} /> tasks
        </Link>
        <span>/</span>
        <span>{task.slug}</span>
      </div>

      <div className="task-head">
        <div>
          <div className="row wrap" style={{ gap: 8 }}>
            <DifficultyBadge difficulty={task.difficulty} />
            <ScorePill score={task.score} />
            <Badge tone="violet">{task.languageVersion}</Badge>
            {task.ratingTable && <Badge tone="amber">event task</Badge>}
          </div>
          <h1>{task.title}</h1>
          <div className="task-meta-row">
            <span>
              <Users size={12} style={{ verticalAlign: '-1px' }} /> {plural(task.solvedBy, 'solve')}
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
            Reset code
          </GlowButton>
          <LinkButton to="/rating" size="sm" icon={<Trophy size={13} />}>
            Rating
          </LinkButton>
        </div>
      </div>

      <div className="task-layout">
        <Panel className="statement-panel">
          <Markdown text={task.statement} />

          <h3 style={{ marginTop: 24, fontSize: 17 }}>Examples</h3>
          <div style={{ marginTop: 10 }}>
            {task.examples.map((example, index) => (
              <div className="example" key={index}>
                <div className="example-head">example {index + 1}</div>
                <div className="example-body">
                  <div>
                    <span className="example-label">input</span>
                    <span className="mono">{example.input}</span>
                  </div>
                  <div>
                    <span className="example-label">output</span>
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

          <h3 style={{ marginTop: 22, fontSize: 17 }}>Constraints</h3>
          <ul className="constraints" style={{ marginTop: 10 }}>
            {task.constraints.map((constraint) => (
              <li key={constraint}>{constraint}</li>
            ))}
          </ul>

          <div className="notice mt-16">
            <strong className="mono" style={{ fontSize: 12 }}>
              <Sparkles size={12} style={{ verticalAlign: '-1px' }} /> editor addons
            </strong>
            <div className="stack" style={{ gap: 6, marginTop: 8 }}>
              {analysis.packs.map((pack) => (
                <div key={pack.id} className="mono" style={{ fontSize: 11.5 }}>
                  <span className="badge badge-violet">{pack.id}</span> {pack.title} —{' '}
                  <span className="dim">{pack.description}</span>
                </div>
              ))}
            </div>
            <div className="dim mono" style={{ fontSize: 10.5, marginTop: 8 }}>
              Syntax highlight &amp; formatter are mocked; diagnostics are produced by source and AST
              passes. Time limit {task.timeLimitMs} ms.
            </div>
          </div>
        </Panel>

        <div className="workspace">
          {!user && (
            <div className="notice">
              <strong>Sign in to run and submit.</strong> Demo account:{' '}
              <Link to="/auth">neko / nyanya</Link>. The judge is mocked, but it still keeps score.
            </div>
          )}

          <LwEditor
            code={code}
            onChange={setCode}
            version={version}
            addonPacks={task.addonPacks}
            diagnostics={analysis.diagnostics}
            onRun={user ? handleRun : undefined}
            onSubmit={user ? handleSubmit : undefined}
            running={run.isPending}
            submitting={submit.isPending}
          />

          {runResult && (
            <Panel className="panel-pad">
              <div className="row-between wrap">
                <div className="row" style={{ gap: 10 }}>
                  <StatusPill status={runResult.status} />
                  <span className="mono dim" style={{ fontSize: 11.5 }}>
                    mock runner · example tests only
                  </span>
                </div>
                <button className="mono dim" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setRunResult(null)}>
                  dismiss
                </button>
              </div>
              <div className="run-output">
                {runResult.tests.map((test, index) => (
                  <div className="test-row" key={index}>
                    <span className={`status-dot ${test.passed ? 'ok' : 'bad'}`} />
                    <span className="name">{test.name}</span>
                    <span className="mono dim">{test.input}</span>
                    <span style={{ marginLeft: 'auto' }}>{test.passed ? 'passed' : 'failed'}</span>
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
                  {verdict.submission.status === 'OK' ? 'ACCEPTED' : 'NOT ACCEPTED'}
                </div>
                <div className="verdict-stats" style={{ marginTop: 8 }}>
                  <span>
                    score <strong>{verdict.submission.score}</strong>
                  </span>
                  <span>
                    tests{' '}
                    <strong>
                      {verdict.submission.testsPassed}/{verdict.submission.testsTotal}
                    </strong>
                  </span>
                  <span>
                    rating{' '}
                    <strong
                      style={{
                        color: verdict.ratingUpdate.delta >= 0 ? 'var(--cyan)' : 'var(--magenta)',
                      }}
                    >
                      {verdict.ratingUpdate.delta >= 0
                        ? `+${verdict.ratingUpdate.delta}`
                        : verdict.ratingUpdate.delta}
                    </strong>
                  </span>
                  <span>
                    rank <strong>#{verdict.ratingUpdate.rank}</strong>{' '}
                    <span className="dim">(was #{verdict.ratingUpdate.rankBefore})</span>
                  </span>
                </div>
              </div>
              <div className="verdict-actions">
                <GlowButton size="sm" onClick={() => setOpenSubmission(verdict.submission.id)}>
                  View submission
                </GlowButton>
                <button
                  className="icon-btn"
                  aria-label="Dismiss verdict"
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
                <ListChecks size={13} /> My submissions
              </button>
              <button className={tab === 'all' ? 'tab active' : 'tab'} onClick={() => setTab('all')}>
                <Users size={13} /> All submissions
              </button>
              <button className={tab === 'rating' ? 'tab active' : 'tab'} onClick={() => setTab('rating')}>
                <Trophy size={13} /> Task rating
              </button>
              {task.ratingTable && (
                <button
                  className={tab === 'event' ? 'tab active' : 'tab'}
                  onClick={() => setTab('event')}
                >
                  <Sparkles size={13} /> Event ladder
                </button>
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

            {tab === 'mine' &&
              (user ? (
                <TaskSubmissions
                  query={mine}
                  currentUserId={user.id}
                  isAdmin={isAdmin}
                  onOpen={setOpenSubmission}
                  emptyTitle="No submissions yet"
                  emptyBody="Run your code, then submit. The cat keeps receipts."
                />
              ) : (
                <EmptyState title="Sign in to see your submissions">
                  <Link to="/auth">Log in as neko / nyanya</Link>
                </EmptyState>
              ))}

            {tab === 'all' &&
              (user ? (
                <TaskSubmissions
                  query={all}
                  currentUserId={user.id}
                  isAdmin={isAdmin}
                  onOpen={setOpenSubmission}
                  emptyTitle="No submissions for this task yet"
                  emptyBody="Be the first cat on the board."
                />
              ) : (
                <EmptyState title="Sign in to see the submission log">
                  Code stays private; the log does not.
                </EmptyState>
              ))}

            {tab === 'rating' && <RatingTablePanel tableId={`task:${task.id}`} />}

            {tab === 'event' && task.ratingTable && <RatingTablePanel tableId={task.ratingTable} />}

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
  if (query.isLoading) return <Loading label="loading submissions…" />
  if (query.error) return <ErrorNotice message="Could not load submissions." />
  const items: SubmissionSummary[] = query.data ?? []
  if (items.length === 0) return <EmptyState title={emptyTitle}>{emptyBody}</EmptyState>

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Cat</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Score</th>
            <th>Tests</th>
            <th>Time</th>
            <th>Lang</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((submission) => {
            const canOpen = submission.userId === currentUserId || isAdmin
            return (
              <tr
                key={submission.id}
                className={clsx('submission-row', !canOpen && 'private')}
                onClick={() =>
                  canOpen ? onOpen(submission.id) : toast('info', 'Code is private to its author.')
                }
              >
                <td className="mono-cell">{formatRelative(submission.createdAt)}</td>
                <td>
                  <span className="row" style={{ gap: 6 }}>
                    {submission.username}
                    {submission.userId === currentUserId && <span className="badge badge-cyan">you</span>}
                  </span>
                </td>
                <td>
                  <StatusPill status={submission.status} />
                </td>
                <td className="score-cell" style={{ textAlign: 'right' }}>
                  {submission.score}
                </td>
                <td className="mono-cell">
                  {submission.testsPassed}/{submission.testsTotal}
                </td>
                <td className="mono-cell">{submission.durationMs} ms</td>
                <td className="mono-cell">{submission.languageVersion}</td>
                <td className="mono-cell dim">{canOpen ? 'open →' : 'private'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
