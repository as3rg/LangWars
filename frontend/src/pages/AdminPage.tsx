import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react'
import type { Accent, NewsCategory, NewsItem } from '@/api/types'
import {
  qk,
  useAdminSummary,
  useAdminUsers,
  useLogin,
  useNews,
  useNewsMutations,
  useSession,
} from '@/api/hooks'
import { api } from '@/api/client'
import { CatMascot } from '@/components/CatMascot'
import {
  Avatar,
  Badge,
  ErrorNotice,
  GlowButton,
  LinkButton,
  Loading,
  Panel,
  StatTile,
  StatusPill,
} from '@/components/ui'
import { formatRelative } from '@/lib/time'
import { toast } from '@/store/ui'

const CATEGORIES: NewsCategory[] = ['event', 'update', 'maintenance', 'holiday']
const ACCENTS: Accent[] = ['cyan', 'magenta', 'violet', 'amber']

export function AdminPage() {
  const { user, isAdmin, loading } = useSession()
  const login = useLogin()
  const queryClient = useQueryClient()

  const summary = useAdminSummary(isAdmin)
  const users = useAdminUsers(isAdmin)
  const news = useNews()
  const { create, update, remove } = useNewsMutations()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<NewsCategory>('update')
  const [accent, setAccent] = useState<Accent>('cyan')
  const [pinned, setPinned] = useState(false)

  const updateUser = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { role?: 'user' | 'admin'; adminNote?: string } }) =>
      api.updateUser(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.adminUsers })
      toast('success', 'User updated.')
    },
  })

  const resetMock = useMutation({
    mutationFn: api.resetMock,
    onSuccess: () => {
      queryClient.clear()
      toast('info', 'Mock database reset. Reloading…')
      window.setTimeout(() => window.location.reload(), 450)
    },
  })

  const resetForm = () => {
    setEditingId(null)
    setTitle('')
    setBody('')
    setCategory('update')
    setAccent('cyan')
    setPinned(false)
  }

  const startEdit = (item: NewsItem) => {
    setEditingId(item.id)
    setTitle(item.title)
    setBody(item.body)
    setCategory(item.category)
    setAccent(item.accent)
    setPinned(item.pinned)
  }

  const submitNews = () => {
    if (!title.trim()) {
      toast('error', 'News needs a title.')
      return
    }
    const payload = { title: title.trim(), body, category, accent, pinned }
    if (editingId) {
      update.mutate(
        { id: editingId, patch: payload },
        {
          onSuccess: () => {
            toast('success', 'News updated.')
            resetForm()
          },
        },
      )
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast('success', 'News published.')
          resetForm()
        },
      })
    }
  }

  if (loading) return <Loading label="checking admin role…" />

  if (!user) {
    return (
      <Panel className="panel-pad" style={{ maxWidth: 620, margin: '40px auto' }}>
        <div className="row" style={{ gap: 16 }}>
          <CatMascot size={70} mood="admin" animated={false} />
          <div>
            <h2 style={{ fontSize: 22 }}>Admin pane locked</h2>
            <p className="muted" style={{ marginBottom: 14 }}>
              Sign in first. The API enforces the admin role — this page only renders what the backend
              allows.
            </p>
            <LinkButton to="/auth" variant="primary">
              Go to sign in
            </LinkButton>
          </div>
        </div>
      </Panel>
    )
  }

  if (!isAdmin) {
    return (
      <Panel className="panel-pad" style={{ maxWidth: 660, margin: '40px auto' }}>
        <div className="row" style={{ gap: 16 }}>
          <CatMascot size={74} mood="admin" animated={false} />
          <div>
            <div className="eyebrow">403 · role required</div>
            <h2 style={{ fontSize: 22, margin: '6px 0' }}>Admin access required</h2>
            <p className="muted" style={{ marginBottom: 14 }}>
              You are signed in as <strong>{user.username}</strong> ({user.role}). Use the demo admin
              account to preview the pane, or implement RBAC on the real backend.
            </p>
            <GlowButton
              variant="primary"
              loading={login.isPending}
              icon={<ShieldCheck size={14} />}
              onClick={() =>
                login.mutate(
                  { username: 'admin', password: 'nyanya' },
                  { onSuccess: () => toast('success', 'Signed in as senpai (admin).') },
                )
              }
            >
              Sign in as admin
            </GlowButton>
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="eyebrow">control room</div>
          <h2 className="section-title">
            <ShieldCheck size={20} color="var(--amber)" /> Admin pane
          </h2>
          <div className="section-sub">
            News and users are wired to the mock API. Auth and authorization stay backend-owned.
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <Badge tone="amber">role: admin</Badge>
          <GlowButton
            size="sm"
            variant="danger"
            loading={resetMock.isPending}
            icon={<RefreshCw size={13} />}
            onClick={() => {
              if (window.confirm('Reset the mock database and reseed all data?')) resetMock.mutate()
            }}
          >
            Reset mock DB
          </GlowButton>
        </div>
      </div>

      {summary.isLoading && <Loading label="loading dashboard…" />}
      {summary.error && <ErrorNotice message="Could not load admin summary." />}
      {summary.data && (
        <>
          <div className="admin-grid">
            <StatTile label="Users" value={summary.data.users} />
            <StatTile label="Tasks" value={summary.data.tasks} />
            <StatTile label="Submissions" value={summary.data.submissions} />
            <StatTile label="News" value={summary.data.news} />
            <StatTile label="Reports" value={summary.data.pendingReports} />
          </div>

          <Panel className="panel-pad" style={{ marginBottom: 20 }}>
            <div className="row-between wrap" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 17 }}>Recent submissions</h3>
              <Link to="/submissions" className="mono" style={{ fontSize: 12 }}>
                open full log →
              </Link>
            </div>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Cat</th>
                    <th>Task</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.data.recent.map((submission) => (
                    <tr key={submission.id}>
                      <td className="mono-cell">{formatRelative(submission.createdAt)}</td>
                      <td>{submission.username}</td>
                      <td>{submission.taskTitle}</td>
                      <td>
                        <StatusPill status={submission.status} />
                      </td>
                      <td className="score-cell" style={{ textAlign: 'right' }}>
                        {submission.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      <div className="admin-columns">
        <Panel className="panel-pad">
          <div className="row-between wrap" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 17 }}>{editingId ? 'Edit news' : 'Publish news'}</h3>
            {editingId && (
              <button className="icon-btn" onClick={resetForm} aria-label="Cancel editing">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="stack">
            <div className="field">
              <label htmlFor="news-title">title</label>
              <input
                id="news-title"
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="news-body">body (markdown-lite)</label>
              <textarea
                id="news-body"
                className="textarea"
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="news-category">category</label>
                <select
                  id="news-category"
                  className="select"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as NewsCategory)}
                >
                  {CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="news-accent">accent</label>
                <select
                  id="news-accent"
                  className="select"
                  value={accent}
                  onChange={(event) => setAccent(event.target.value as Accent)}
                >
                  {ACCENTS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
              pin to the top of the news feed
            </label>
            <GlowButton
              variant="primary"
              icon={editingId ? <Pencil size={13} /> : <Plus size={13} />}
              loading={create.isPending || update.isPending}
              onClick={submitNews}
            >
              {editingId ? 'Save changes' : 'Publish'}
            </GlowButton>
          </div>
        </Panel>

        <Panel className="panel-pad">
          <h3 style={{ fontSize: 17, marginBottom: 6 }}>News feed ({news.data?.length ?? 0})</h3>
          <div className="stack" style={{ gap: 0 }}>
            {news.data?.map((item) => (
              <div className="news-admin-item" key={item.id}>
                <div>
                  <div className="row wrap" style={{ gap: 6 }}>
                    <Badge tone={item.accent === 'cyan' ? 'cyan' : item.accent === 'amber' ? 'amber' : item.accent === 'violet' ? 'violet' : 'magenta'}>
                      {item.category}
                    </Badge>
                    {item.pinned && <Badge tone="amber">pinned</Badge>}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13.5 }}>{item.title}</div>
                  <div className="mono dim" style={{ fontSize: 10.5 }}>
                    {formatRelative(item.createdAt)}
                  </div>
                </div>
                <div className="actions">
                  <button className="icon-btn" aria-label="Edit news" onClick={() => startEdit(item)}>
                    <Pencil size={13} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label="Delete news"
                    onClick={() => {
                      if (window.confirm(`Delete "${item.title}"?`)) {
                        remove.mutate(item.id, { onSuccess: () => toast('info', 'News deleted.') })
                      }
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="panel-pad mt-24">
        <h3 style={{ fontSize: 17, marginBottom: 12 }}>Users</h3>
        {users.isLoading && <Loading label="loading users…" />}
        {users.error && <ErrorNotice message="Could not load users." />}
        {users.data && (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cat</th>
                  <th>Role</th>
                  <th style={{ textAlign: 'right' }}>Rating</th>
                  <th style={{ textAlign: 'right' }}>Solved</th>
                  <th>Streak</th>
                  <th>Note</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="user-cell">
                        <Avatar username={row.username} hue={row.avatarHue} />
                        {row.username}
                      </span>
                    </td>
                    <td>
                      <Badge tone={row.role === 'admin' ? 'amber' : 'violet'}>{row.role}</Badge>
                    </td>
                    <td className="score-cell" style={{ textAlign: 'right' }}>
                      {row.rating}
                    </td>
                    <td className="mono-cell" style={{ textAlign: 'right' }}>
                      {row.solvedCount}
                    </td>
                    <td className="mono-cell">{row.streak}</td>
                    <td className="mono-cell dim">{row.adminNote ?? '—'}</td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <button
                          className="filter-chip"
                          onClick={() =>
                            updateUser.mutate({
                              id: row.id,
                              patch: { role: row.role === 'admin' ? 'user' : 'admin' },
                            })
                          }
                        >
                          {row.role === 'admin' ? 'demote' : 'promote'}
                        </button>
                        <button
                          className="filter-chip"
                          onClick={() => {
                            const note = window.prompt('Admin note', row.adminNote ?? '')
                            if (note !== null) {
                              updateUser.mutate({ id: row.id, patch: { adminNote: note } })
                            }
                          }}
                        >
                          note
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
