import { useState, type ReactNode } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Plus, RefreshCw } from 'lucide-react'
import { api } from '@/api/client'
import type { AdminTask, NewsItem, PlatformSettings, SubmissionCursor, User } from '@/api/types'
import { useSession } from '@/api/hooks'
import { Badge, ErrorNotice, GlowButton, LinkButton, Loading, Panel, StatusPill } from '@/components/ui'
import { SubmissionModal } from '@/components/SubmissionModal'
import { formatRelative } from '@/lib/time'
import { toast } from '@/store/ui'

const OPERATIONS = ['eq', 'cmp', 'cast', 'get', 'set', 'length', 'empty', 'contains', 'push_back', 'truthy', 'concat']
const TABS = ['Settings', 'Users', 'Tasks', 'Events', 'Submissions', 'Audit'] as const
type Tab = typeof TABS[number]
function message(error: unknown) { return error instanceof Error ? error.message : 'Request failed' }
function words(text: string) { return [...new Set(text.toLowerCase().split(/[,;\s]+/).map((word) => word.replace(/^"|"$/g, '')).filter(Boolean))] }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label> }

export function AdminPage() {
  const session = useSession()
  const [tab, setTab] = useState<Tab>('Settings')
  if (session.loading) return <Loading />
  if (!session.isAdmin) return <Panel className="panel-pad"><p>Administrator access is required.</p><LinkButton to="/auth">Sign in</LinkButton></Panel>
  return <div className="stack"><div className="section-head"><h1 className="section-title"><ShieldCheck size={22} /> Administration</h1><Badge tone="amber">{session.user?.username}</Badge></div>
    <div className="tabs" role="tablist" aria-label="Administration">{TABS.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'tab active' : 'tab'} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === 'Settings' && <Settings />}{tab === 'Users' && <Users currentId={session.user!.id} />}{tab === 'Tasks' && <Tasks />}{tab === 'Events' && <Events />}{tab === 'Submissions' && <SubmissionFeed />}{tab === 'Audit' && <Audit />}
  </div>
}

function useAction() {
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (action: () => Promise<unknown>, success = 'Saved.') => {
    if (busy) return
    setBusy(true); setError('')
    try { await action(); await client.invalidateQueries(); toast('success', success) }
    catch (cause) { setError(message(cause)) }
    finally { setBusy(false) }
  }
  return { run, busy, error }
}

function Settings() {
  const query = useQuery({ queryKey: ['admin', 'settings'], queryFn: api.adminSettings })
  const invites = useQuery({ queryKey: ['admin', 'invites'], queryFn: api.invites })
  const action = useAction()
  const [code, setCode] = useState('')
  if (query.isLoading) return <Loading />
  if (query.error) return <ErrorNotice message={message(query.error)} />
  return <div className="stack">
    {query.data && <SettingsForm settings={query.data} />}
    <Panel className="panel-pad stack">
      <div className="row-between wrap"><span>Invitations</span><GlowButton size="sm" loading={action.busy} onClick={() => action.run(async () => { const created = await api.createInvite(); setCode(created.code ?? '') }, 'Invitation created.')}>Create invitation</GlowButton></div>
      {code && <div className="notice"><p>Copy this code now; it will only be shown once.</p><input className="input mono" readOnly aria-label="New invitation code" value={code} onFocus={(event) => event.target.select()} /><GlowButton size="sm" onClick={() => navigator.clipboard.writeText(code).then(() => toast('success', 'Copied.')).catch(() => toast('info', 'Select and copy the code above.'))}>Copy</GlowButton></div>}
      {invites.error && <ErrorNotice message={message(invites.error)} />}
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Created</th><th>Status</th><th /></tr></thead><tbody>{invites.data?.map((invite) => <tr key={invite.id}><td>{formatRelative(invite.createdAt)}</td><td>{invite.usedAt ? `Used ${formatRelative(invite.usedAt)}` : 'Available'}</td><td><GlowButton size="sm" disabled={action.busy} onClick={() => action.run(() => api.deleteInvite(invite.id), 'Invitation revoked.')}>Revoke</GlowButton></td></tr>)}</tbody></table></div>
      {action.error && <ErrorNotice message={action.error} />}
    </Panel>
  </div>
}

function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const [draft, setDraft] = useState(settings)
  const [allowed, setAllowed] = useState(settings.allowedWords.join('\n'))
  const [denied, setDenied] = useState(settings.denyWords.join('\n'))
  const action = useAction()
  const number = (key: 'defaultNameLimit' | 'runCooldownSeconds' | 'submitCooldownSeconds' | 'defaultCoreOverrideLimit' | 'maxQueuedJobs', label: string) => <Field label={label}><input className="input" type="number" min="0" value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: Number(event.target.value) })} /></Field>
  return <Panel className="panel-pad stack"><div className="form-grid">
    <Field label="Registration"><select className="select" value={draft.registrationMode} onChange={(event) => setDraft({ ...draft, registrationMode: event.target.value as PlatformSettings['registrationMode'] })}><option value="open">Open</option><option value="invite">Invitation only</option><option value="closed">Closed</option></select></Field>
    {number('defaultNameLimit', 'Names per user')}{number('runCooldownSeconds', 'Run cooldown (seconds)')}{number('submitCooldownSeconds', 'Submission cooldown (seconds)')}{number('defaultCoreOverrideLimit', 'Core overrides per task')}{number('maxQueuedJobs', 'Queue capacity')}
  </div>
    <Field label="Allowed words"><textarea className="textarea mono" rows={6} value={allowed} onChange={(event) => setAllowed(event.target.value)} placeholder="One word per line, or CSV" /></Field>
    <label className="row wrap" style={{ gap: 12 }}>Import dictionary CSV<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1_000_000) { toast('error', 'Dictionary must be smaller than 1 MB.'); return }; setAllowed(words(await file.text()).join('\n')) }} /></label>
    <Field label="Denied words"><textarea className="textarea mono" rows={4} value={denied} onChange={(event) => setDenied(event.target.value)} placeholder="One term per line" /></Field>
    <div className="row wrap" style={{ gap: 10 }}>{OPERATIONS.map((operation) => <label className="filter-chip" key={operation}><input type="checkbox" checked={draft.permittedOverrides.includes(operation)} onChange={(event) => setDraft({ ...draft, permittedOverrides: event.target.checked ? [...draft.permittedOverrides, operation] : draft.permittedOverrides.filter((item) => item !== operation) })} /> @{operation}</label>)}</div>
    <div className="row wrap" style={{ gap: 10 }}><GlowButton variant="primary" loading={action.busy} onClick={() => action.run(() => api.saveSettings({ ...draft, allowedWords: words(allowed), denyWords: denied.split(/\r?\n/).map((term) => term.trim()).filter(Boolean) }))}>Save settings</GlowButton>
      <GlowButton variant="danger" disabled={action.busy} onClick={() => { if (window.confirm('Restore every core operation to its default implementation? Existing solutions will be rechecked.')) action.run(() => api.restoreOverrides(), 'Core operations restored.') }}>Restore all core defaults</GlowButton>
    </div>
    <div className="row wrap" style={{ gap: 6 }}>{OPERATIONS.map((operation) => <button className="filter-chip" key={operation} disabled={action.busy} title={`Restore @${operation} to its default`} onClick={() => action.run(() => api.restoreOverrides([operation]), `@${operation} restored.`)}>Restore @{operation}</button>)}</div>
    {action.error && <ErrorNotice message={action.error} />}
  </Panel>
}

function Users({ currentId }: { currentId: string }) {
  const query = useQuery({ queryKey: ['admin', 'users'], queryFn: api.adminUsers })
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<User | null>(null)
  const [password, setPassword] = useState('')
  const action = useAction()
  return <Panel className="panel-pad stack"><input className="input" aria-label="Search users" placeholder="Search users" value={search} onChange={(event) => setSearch(event.target.value)} />
    {query.isLoading && <Loading />}{query.error && <ErrorNotice message={message(query.error)} />}
    <div className="table-wrap"><table className="data-table"><thead><tr><th>User</th><th>Role</th><th>Names</th><th>Rating</th><th>Status</th><th /></tr></thead><tbody>{query.data?.filter((user) => user.username.toLowerCase().includes(search.toLowerCase())).map((user) => <tr key={user.id}><td>{user.username}</td><td>{user.role}</td><td>{user.usedNames ?? 0} / {user.nameLimit ?? 'default'}</td><td>{user.rating}</td><td>{user.banned ? 'Banned' : 'Active'}</td><td><GlowButton size="sm" onClick={() => { setEditing(user); setPassword('') }}>Manage</GlowButton></td></tr>)}</tbody></table></div>
    {editing && <div className="notice stack"><div className="row-between"><strong>{editing.username}</strong><GlowButton size="sm" onClick={() => setEditing(null)}>Close</GlowButton></div><div className="form-grid">
      <Field label="Role"><select className="select" value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value as User['role'] })}><option value="user">Player</option><option value="admin">Administrator</option></select></Field>
      <Field label="Name limit"><input className="input" type="number" min="0" value={editing.nameLimit ?? 100} onChange={(event) => setEditing({ ...editing, nameLimit: Number(event.target.value) })} /></Field>
      <Field label="Private note"><input className="input" value={editing.adminNote ?? ''} onChange={(event) => setEditing({ ...editing, adminNote: event.target.value })} /></Field>
      <label className="row" style={{ gap: 8 }}><input type="checkbox" disabled={editing.id === currentId} checked={editing.banned ?? false} onChange={(event) => setEditing({ ...editing, banned: event.target.checked })} /> Ban account and revoke sessions</label>
    </div><GlowButton variant="primary" loading={action.busy} onClick={() => action.run(() => api.updateUser(editing.id, Object.fromEntries(Object.entries({ role: editing.role, adminNote: editing.adminNote, nameLimit: editing.nameLimit, banned: editing.banned }).filter(([key, value]) => value !== query.data?.find((item) => item.id === editing.id)?.[key as keyof User]))))}>Save user</GlowButton>
    <div className="row wrap" style={{ gap: 10 }}><input className="input" style={{ flex: 1 }} aria-label="New password" type="password" autoComplete="new-password" placeholder="New password (at least 12 characters)" value={password} onChange={(event) => setPassword(event.target.value)} /><GlowButton disabled={password.length < 12 || action.busy} onClick={() => action.run(async () => { await api.resetPassword(editing.id, password); setPassword('') }, 'Password reset and sessions revoked.')}>Reset password</GlowButton></div>
    <GlowButton variant="danger" disabled={editing.id === currentId || action.busy} onClick={() => { if (window.confirm(`Permanently delete ${editing.username}? This cannot be undone.`)) action.run(async () => { await api.deleteUser(editing.id); setEditing(null) }, 'User deleted.') }}>Delete user</GlowButton></div>}
    {action.error && <ErrorNotice message={action.error} />}
  </Panel>
}

const NEW_TASK: Partial<AdminTask> = { title: '', slug: '', difficulty: 'easy', score: 50, statement: '', constraints: [], examples: [], starterCode: '@solution\nfn answer(value) {\n  return value;\n}', languageVersion: 'v0.3', addonPacks: ['core'], entryPoint: 'answer', timeLimitMs: 1000, tags: [], coreOverrideLimit: 2, tests: [{ input: [1], expected: 1, hidden: false }] }
function Tasks() {
  const query = useQuery({ queryKey: ['admin', 'tasks'], queryFn: api.adminTasks })
  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: api.adminSettings })
  const [draft, setDraft] = useState<Partial<AdminTask> | null>(null)
  const [tests, setTests] = useState('[]')
  const [allowed, setAllowed] = useState('')
  const action = useAction()
  const edit = (task: Partial<AdminTask>) => { setDraft(task); setTests(JSON.stringify(task.tests ?? [], null, 2)); setAllowed(task.allowedWords?.join('\n') ?? '') }
  const update = (patch: Partial<AdminTask>) => setDraft((previous) => ({ ...previous, ...patch }))
  return <Panel className="panel-pad stack"><div className="row-between"><span>{query.data?.length ?? 0} tasks</span><GlowButton size="sm" icon={<Plus size={13} />} onClick={() => edit({ ...NEW_TASK, coreOverrideLimit: settings.data?.defaultCoreOverrideLimit ?? 2 })}>Create task</GlowButton></div>
    {query.error && <ErrorNotice message={message(query.error)} />}
    {!draft && <div className="stack">{query.data?.map((task) => <div className="row-between" key={task.id}><span>{task.title} <Badge>{task.difficulty}</Badge></span><GlowButton size="sm" onClick={() => edit(task)}>Edit</GlowButton></div>)}</div>}
    {draft && <div className="stack"><div className="form-grid"><Field label="Title"><input className="input" value={draft.title} onChange={(event) => update({ title: event.target.value })} /></Field><Field label="Slug"><input className="input" value={draft.slug} onChange={(event) => update({ slug: event.target.value })} /></Field>
      <Field label="Difficulty"><select className="select" value={draft.difficulty} onChange={(event) => update({ difficulty: event.target.value as AdminTask['difficulty'] })}>{['easy', 'medium', 'hard', 'nightmare'].map((value) => <option key={value}>{value}</option>)}</select></Field>
      <Field label="Score"><input className="input" type="number" min="0" value={draft.score} onChange={(event) => update({ score: Number(event.target.value) })} /></Field>
      <Field label="Time limit (ms)"><input className="input" type="number" min="1" value={draft.timeLimitMs} onChange={(event) => update({ timeLimitMs: Number(event.target.value) })} /></Field><Field label="Core override limit"><input className="input" type="number" min="0" value={draft.coreOverrideLimit ?? 2} onChange={(event) => update({ coreOverrideLimit: Number(event.target.value) })} /></Field>
      <Field label="Tags"><input className="input" value={draft.tags?.join(', ')} onChange={(event) => update({ tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></Field><Field label="Event ladder (optional)"><input className="input" value={draft.ratingTable ?? ''} onChange={(event) => update({ ratingTable: event.target.value || undefined })} /></Field>
    </div><Field label="Problem statement"><textarea className="textarea" rows={8} value={draft.statement} onChange={(event) => update({ statement: event.target.value })} /></Field>
    <Field label="Constraints (one per line)"><textarea className="textarea" value={draft.constraints?.join('\n')} onChange={(event) => update({ constraints: event.target.value.split('\n').filter(Boolean) })} /></Field>
    <Field label="Starter code"><textarea className="textarea mono" rows={8} value={draft.starterCode} onChange={(event) => update({ starterCode: event.target.value })} /></Field>
    <Field label="Tests (JSON: input argument array, expected value, hidden)"><textarea className="textarea mono" rows={12} value={tests} onChange={(event) => setTests(event.target.value)} /></Field>
    <Field label="Task dictionary (blank uses the platform dictionary)"><textarea className="textarea mono" rows={3} value={allowed} onChange={(event) => setAllowed(event.target.value)} /></Field>
    <div className="row wrap" style={{ gap: 10 }}><GlowButton variant="primary" loading={action.busy} onClick={() => action.run(async () => { const parsed: AdminTask['tests'] = JSON.parse(tests); if (!Array.isArray(parsed) || !parsed.length || parsed.some((test) => !Array.isArray(test.input) || !Object.hasOwn(test, 'expected'))) throw new Error('Each test needs an input array and expected value.'); const payload = { ...draft, tests: parsed, allowedWords: allowed.trim() ? words(allowed) : null, examples: parsed.filter((test) => !test.hidden).map((test) => ({ input: JSON.stringify(test.input), output: JSON.stringify(test.expected) })) }; if (draft.id) await api.updateTask(draft.id, payload); else await api.createTask(payload); setDraft(null) })}>Save task</GlowButton><GlowButton onClick={() => setDraft(null)}>Cancel</GlowButton>{draft.id && <GlowButton variant="danger" disabled={action.busy} onClick={() => { if (window.confirm('Delete this task?')) action.run(async () => { await api.deleteTask(draft.id!); setDraft(null) }, 'Task deleted.') }}>Delete</GlowButton>}</div></div>}
    {action.error && <ErrorNotice message={action.error} />}
  </Panel>
}

function Events() {
  const query = useQuery({ queryKey: ['news'], queryFn: api.news })
  const [draft, setDraft] = useState<Partial<NewsItem>>({ title: '', body: '', category: 'event', accent: 'cyan', pinned: false })
  const action = useAction()
  const update = (patch: Partial<NewsItem>) => setDraft((previous) => ({ ...previous, ...patch }))
  return <div className="admin-columns"><Panel className="panel-pad stack"><Field label="Title"><input className="input" value={draft.title} onChange={(event) => update({ title: event.target.value })} /></Field><Field label="Message"><textarea className="textarea" rows={8} value={draft.body} onChange={(event) => update({ body: event.target.value })} /></Field>
    <div className="form-grid"><Field label="Category"><select className="select" value={draft.category} onChange={(event) => update({ category: event.target.value as NewsItem['category'] })}>{['event', 'update', 'maintenance', 'holiday'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Accent"><select className="select" value={draft.accent} onChange={(event) => update({ accent: event.target.value as NewsItem['accent'] })}>{['cyan', 'magenta', 'violet', 'amber'].map((item) => <option key={item}>{item}</option>)}</select></Field>
    <Field label="Starts at (UTC)"><input className="input" type="datetime-local" value={draft.startsAt?.slice(0, 16) ?? ''} onChange={(event) => update({ startsAt: event.target.value ? `${event.target.value}:00Z` : '' })} /></Field><Field label="Ends at (UTC)"><input className="input" type="datetime-local" value={draft.endsAt?.slice(0, 16) ?? ''} onChange={(event) => update({ endsAt: event.target.value ? `${event.target.value}:00Z` : '' })} /></Field></div>
    <div className="form-grid"><Field label="Button text (optional)"><input className="input" value={draft.cta?.label ?? ''} onChange={(event) => update({ cta: event.target.value ? { label: event.target.value, href: draft.cta?.href ?? '/tasks' } : null })} /></Field><Field label="Button destination"><input className="input" placeholder="/tasks/shared-sum" value={draft.cta?.href ?? ''} onChange={(event) => update({ cta: event.target.value ? { href: event.target.value, label: draft.cta?.label ?? 'View' } : null })} /></Field></div>
    <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={draft.pinned} onChange={(event) => update({ pinned: event.target.checked })} /> Pin to feed</label>
    <div className="row wrap" style={{ gap: 10 }}><GlowButton variant="primary" loading={action.busy} disabled={!draft.title?.trim()} onClick={() => action.run(async () => { if (draft.id) await api.updateNews(draft.id, draft); else await api.createNews(draft); setDraft({ title: '', body: '', category: 'event', accent: 'cyan', pinned: false }) }, draft.id ? 'Updated.' : 'Published.')}>{draft.id ? 'Save' : 'Publish'}</GlowButton><GlowButton onClick={() => setDraft({ title: '', body: '', category: 'event', accent: 'cyan', pinned: false })}>Clear</GlowButton></div>{action.error && <ErrorNotice message={action.error} />}
  </Panel><Panel className="panel-pad stack">{query.error && <ErrorNotice message={message(query.error)} />}{query.data?.map((item) => <div className="news-admin-item" key={item.id}><div><Badge>{item.category}</Badge><p>{item.title}</p><span className="dim">{formatRelative(item.createdAt)}</span></div><div className="row wrap" style={{ gap: 6 }}><GlowButton size="sm" onClick={() => setDraft(item)}>Edit</GlowButton><GlowButton size="sm" variant="danger" onClick={() => { if (window.confirm(`Delete ${item.title}?`)) action.run(() => api.deleteNews(item.id), 'Deleted.') }}>Delete</GlowButton></div></div>)}</Panel></div>
}

function SubmissionFeed() {
  const client = useQueryClient()
  const queryKey = ['admin', 'submissions', 'history'] as const
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => api.adminSubmissions(pageParam),
    initialPageParam: undefined as SubmissionCursor | undefined,
    getNextPageParam: (page) => {
      const last = page.at(-1)
      return page.length === 100 && last ? { beforeCreated: last.createdAt, beforeId: last.id } : undefined
    },
    refetchInterval: (state) => (state.state.data?.pages.length ?? 0) <= 1 ? 5000 : false,
  })
  const seen = new Set<string>()
  const submissions = query.data?.pages.flat().filter((submission) => {
    if (seen.has(submission.id)) return false
    seen.add(submission.id)
    return true
  }) ?? []
  const historyOpen = (query.data?.pages.length ?? 0) > 1
  const [open, setOpen] = useState<string | null>(null)
  return <Panel className="panel-pad stack"><div className="row-between wrap" style={{ gap: 12 }}><span>{historyOpen ? 'History · live updates paused; refresh to return to latest' : 'All player submissions · updates every 5 seconds'}</span><GlowButton size="sm" disabled={query.isFetching} icon={<RefreshCw size={13} />} onClick={() => client.resetQueries({ queryKey, exact: true })}>Refresh</GlowButton></div>{query.error && <ErrorNotice message={message(query.error)} />}
    {query.isPending && <Loading label="Loading submissions…" />}
    <div className="table-wrap"><table className="data-table"><thead><tr><th>When</th><th>Player</th><th>Task</th><th>Verdict</th><th>Tests</th><th /></tr></thead><tbody>{submissions.map((submission) => <tr key={submission.id}><td>{formatRelative(submission.createdAt)}</td><td>{submission.username}</td><td>{submission.taskTitle}</td><td><StatusPill status={submission.status} /></td><td>{submission.testsPassed}/{submission.testsTotal}</td><td><GlowButton size="sm" onClick={() => setOpen(submission.id)}>Inspect</GlowButton></td></tr>)}</tbody></table></div>
    {query.hasNextPage && <GlowButton loading={query.isFetchingNextPage} disabled={query.isRefetching} onClick={() => query.fetchNextPage()}>Load older</GlowButton>}
    {!query.isPending && !submissions.length && !query.error && <p className="muted">No submissions yet.</p>}
    {open && <SubmissionModal id={open} onClose={() => setOpen(null)} />}
  </Panel>
}

function Audit() {
  const query = useQuery({ queryKey: ['admin', 'audit'], queryFn: api.audit, refetchInterval: 10000 })
  return <Panel className="panel-pad">{query.error && <ErrorNotice message={message(query.error)} />}<div className="table-wrap"><table className="data-table"><thead><tr><th>When</th><th>Administrator</th><th>Action</th><th>Target</th></tr></thead><tbody>{query.data?.map((entry) => <tr key={entry.id}><td>{formatRelative(entry.createdAt)}</td><td>{entry.actorId}</td><td>{entry.action}</td><td className="mono-cell">{entry.target}</td></tr>)}</tbody></table></div></Panel>
}
