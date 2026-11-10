import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ListFilter, Lock, ScrollText } from 'lucide-react'
import { useAllSubmissions, useSession, useTasks } from '@/api/hooks'
import type { SubmissionSummary } from '@/api/types'
import { SubmissionModal } from '@/components/SubmissionModal'
import {
  Badge,
  EmptyState,
  ErrorNotice,
  LinkButton,
  Loading,
  Panel,
  StatusPill,
} from '@/components/ui'
import { formatRelative } from '@/lib/time'
import { toast } from '@/store/ui'

export function SubmissionsPage() {
  const { user, isAdmin } = useSession()
  const [mineOnly, setMineOnly] = useState(false)
  const [taskFilter, setTaskFilter] = useState('all')
  const [open, setOpen] = useState<string | null>(null)

  const tasks = useTasks()
  const submissions = useAllSubmissions(mineOnly && user ? { userId: user.id } : {})

  const rows = useMemo(() => {
    const list: SubmissionSummary[] = submissions.data ?? []
    if (taskFilter === 'all') return list
    return list.filter((submission) => submission.taskId === taskFilter)
  }, [submissions.data, taskFilter])

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="eyebrow">audit trail</div>
          <h2 className="section-title">
            <ScrollText size={20} color="var(--cyan)" /> Submission log
          </h2>
          <div className="section-sub">
            Every attempt, newest first. Code and diff are visible only to their author (and admins) —
            the log itself is public to signed-in cats.
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <Badge tone="violet">{rows.length} shown</Badge>
          <Badge tone="amber">
            <Lock size={10} /> code private
          </Badge>
        </div>
      </div>

      <div className="filter-bar">
        <ListFilter size={14} color="var(--dim)" />
        <button
          className={mineOnly ? 'filter-chip active' : 'filter-chip'}
          onClick={() => setMineOnly((value) => !value)}
          disabled={!user}
          title={!user ? 'Sign in to filter your submissions' : undefined}
        >
          mine only
        </button>
        <select
          className="select"
          aria-label="Filter by task"
          style={{ width: 260, padding: '7px 10px' }}
          value={taskFilter}
          onChange={(event) => setTaskFilter(event.target.value)}
        >
          <option value="all">All tasks</option>
          {tasks.data?.map((task) => (
            <option value={task.id} key={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </div>

      {!user && (
        <Panel className="panel-pad">
          <EmptyState title="Sign in to view the log" icon={<Lock size={22} />}>
            <Link to="/auth">Sign in</Link> to view the submission log.
          </EmptyState>
        </Panel>
      )}

      {user && submissions.isLoading && <Loading label="reading the log…" />}
      {user && submissions.error && <ErrorNotice message="Could not load submissions." />}

      {user && submissions.data && (
        <Panel className="panel-pad">
          {rows.length === 0 ? (
            <EmptyState title="No submissions found">Try clearing the filters, or go solve a task.</EmptyState>
          ) : (
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Cat</th>
                    <th>Task</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Score</th>
                    <th>Tests</th>
                    <th>Time</th>
                    <th>Lang</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((submission) => {
                    const canOpen = submission.userId === user.id || isAdmin
                    return (
                      <tr
                        key={submission.id}
                        className={clsx('submission-row', !canOpen && 'private')}
                        onClick={() =>
                          canOpen ? setOpen(submission.id) : toast('info', 'Code is private to its author.')
                        }
                      >
                        <td className="mono-cell">{formatRelative(submission.createdAt)}</td>
                        <td>
                          <span className="row" style={{ gap: 6 }}>
                            {submission.username}
                            {submission.userId === user.id && <span className="badge badge-cyan">you</span>}
                          </span>
                        </td>
                        <td>
                          <Link to={`/tasks/${submission.taskId}`} onClick={(event) => event.stopPropagation()}>
                            {submission.taskTitle}
                          </Link>
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
                        <td className="mono-cell dim">{canOpen ? <button className="filter-chip" onClick={(event) => { event.stopPropagation(); setOpen(submission.id) }}>Open</button> : 'private'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {open && <SubmissionModal id={open} onClose={() => setOpen(null)} />}

          <div className="row-between wrap mt-16">
            <span className="rating-note" style={{ marginTop: 0 }}>
              Rows are clickable only for your own submissions (admins can open all).
            </span>
            <LinkButton to="/tasks" size="sm">
              Solve something
            </LinkButton>
          </div>
        </Panel>
      )}
    </div>
  )
}
