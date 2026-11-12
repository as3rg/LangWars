import { t, useLocale, localizeTask } from '@/lib/i18n'
import { useState, type ReactNode } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Plus, RefreshCw } from 'lucide-react'
import { api } from '@/api/client'
import type { TaskTranslation, AdminTask, NewsItem, PlatformSettings, SubmissionCursor, User } from '@/api/types'
import { useAdminNews, useSession, useTasks } from '@/api/hooks'
import { Badge, ErrorNotice, GlowButton, LinkButton, Loading, Panel, StatusPill } from '@/components/ui'
import { SubmissionModal } from '@/components/SubmissionModal'
import { formatDateTime, formatRelative } from '@/lib/time'
import { toast } from '@/store/ui'
import { inviteLink } from '@/lib/invites'
import { formatNumber } from '@/lib/numbers'
import { PerformancePanel } from '@/components/PerformancePanel'

const OPERATIONS = ['eq', 'cmp', 'cast', 'get', 'set', 'length', 'empty', 'contains', 'push_back', 'truthy', 'concat']
const TASK_KEYWORDS = ['let', 'return', 'if', 'else', 'while', 'comefrom', 'and', 'or', 'not']
const TABS = ['Settings', 'Users', 'Tasks', 'Events', 'Submissions', 'Performance', 'Audit'] as const
type Tab = typeof TABS[number]
function message(error: unknown) { return error instanceof Error ? error.message : 'Request failed' }
function words(text: string) { return [...new Set(text.toLowerCase().split(/[,;\s]+/).map((word) => word.replace(/^"|"$/g, '')).filter(Boolean))] }
function Field({ label, children }: { label: string; children: ReactNode }) {
  useLocale(); return <label className="field"><span>{t(label)}</span>{children}</label> }

export function AdminPage() {
  useLocale()
  const session = useSession()
  const [tab, setTab] = useState<Tab>('Settings')
  if (session.loading) return <Loading />
  if (!session.isAdmin) return <Panel className="panel-pad"><p>{t("Administrator access is required.")}</p><LinkButton to="/auth">{t("Sign in")}</LinkButton></Panel>
  return <div className="stack"><div className="section-head"><h1 className="section-title"><ShieldCheck size={22} /> {t("Administration")}</h1><Badge tone="amber">{session.user?.username}</Badge></div>
    <div className="tabs" role="tablist" aria-label={t("Administration")}>{TABS.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'tab active' : 'tab'} onClick={() => setTab(item)}>{t(item)}</button>)}</div>
    {tab === "Settings" && <Settings />}{tab === "Users" && <Users currentId={session.user!.id} />}{tab === "Tasks" && <Tasks />}{tab === "Events" && <Events />}{tab === "Submissions" && <SubmissionFeed />}{tab === "Performance" && <PerformancePanel />}{tab === "Audit" && <Audit />}
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
  useLocale()
  const query = useQuery({ queryKey: ['admin', 'settings'], queryFn: api.adminSettings })
  const invites = useQuery({ queryKey: ['admin', 'invites'], queryFn: api.invites })
  const action = useAction()
  const [code, setCode] = useState('')
  const [maxUses, setMaxUses] = useState(1)
  const [expiresInHours, setExpiresInHours] = useState(24)
  const link = inviteLink(window.location.origin, code.trim())
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); toast('success', 'Copied.') }
    catch { toast('info', 'Select and copy the value above.') }
  }
  if (query.isLoading) return <Loading />
  if (query.error) return <ErrorNotice message={message(query.error)} />
  return <div className="stack">
    {query.data && <SettingsForm settings={query.data} />}
    <Panel className="panel-pad stack">
      <div className="row-between wrap"><span>{t("Invitations")}</span><GlowButton size="sm" loading={action.busy} onClick={() => action.run(async () => { const created = await api.createInvite({ maxUses, expiresInHours }); setCode(created.code ?? '') }, 'Invitation created.')}>{t("Create invitation")}</GlowButton></div>
      <div className="form-grid"><Field label={t("Registrations allowed")}><input className="input" type="number" min="1" max="500" value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))} /></Field><Field label={t("Expires after (hours)")}><input className="input" type="number" min="1" max="168" value={expiresInHours} onChange={(event) => setExpiresInHours(Number(event.target.value))} /></Field></div>
      <p className="muted">{t("Allow multiple registrations for a presentation QR. New tokens are shown once; keep the link until the event ends.")}</p>
      <Field label={t("Invitation token")}><input className="input mono" value={code} autoComplete="off" spellCheck={false} placeholder={t("Create an invitation or paste an existing token")} onChange={(event) => setCode(event.target.value)} onFocus={(event) => event.target.select()} /></Field>
      {link && <div className="notice stack"><input className="input mono" readOnly aria-label={t("Invitation link")} value={link} onFocus={(event) => event.target.select()} /><div className="row wrap" style={{ gap: 8 }}><GlowButton size="sm" onClick={() => copy(link)}>{t("Copy invite link")}</GlowButton><GlowButton size="sm" onClick={() => copy(code.trim())}>{t("Copy token")}</GlowButton></div></div>}
      {invites.error && <ErrorNotice message={message(invites.error)} />}
      <div className="table-wrap"><table className="data-table"><thead><tr><th>{t("Created")}</th><th>{t("Registrations")}</th><th>{t("Expires")}</th><th>{t("Status")}</th><th /></tr></thead><tbody>{invites.data?.map((invite) => <tr key={invite.id}><td>{formatRelative(invite.createdAt)}</td><td>{invite.uses} / {invite.maxUses}</td><td>{formatDateTime(invite.expiresAt)}</td><td>{invite.uses >= invite.maxUses ? t("Exhausted") : Date.parse(invite.expiresAt) <= Date.now() ? t("Expired") : t("Available")}</td><td><GlowButton size="sm" disabled={action.busy} onClick={() => action.run(() => api.deleteInvite(invite.id), 'Invitation revoked.')}>{t("Revoke")}</GlowButton></td></tr>)}</tbody></table></div>
      {action.error && <ErrorNotice message={action.error} />}
    </Panel>
  </div>
}

function SettingsForm({ settings }: { settings: PlatformSettings }) {
  useLocale()
  const [draft, setDraft] = useState(settings)
  const [allowed, setAllowed] = useState(settings.allowedWords.join('\n'))
  const [denied, setDenied] = useState(settings.denyWords.join('\n'))
  const action = useAction()
  const number = (key: 'defaultNameLimit' | 'defaultTaskNameLimit' | 'runCooldownSeconds' | 'submitCooldownSeconds' | 'defaultCoreOverrideLimit' | 'maxQueuedJobs' | 'maxNameLength' | 'resubmitPenaltyPercent', label: string) => <Field label={label}><input className="input" type="number" min={key === 'maxNameLength' || key === 'maxQueuedJobs' ? 1 : 0} max={key === 'maxNameLength' ? 128 : key === 'resubmitPenaltyPercent' ? 100 : undefined} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: Number(event.target.value) })} /></Field>
  const visibility = (kind: 'variables' | 'functions', field: 'names' | 'values', label: string) => <Field label={label}><select className="select" value={draft.worldVisibility[kind][field]} onChange={(event) => setDraft({ ...draft, worldVisibility: { ...draft.worldVisibility, [kind]: { ...draft.worldVisibility[kind], [field]: event.target.value as 'public' | 'admin_only' } } })}><option value="public">{t("Public")}</option><option value="admin_only">{t("Administrators only")}</option></select></Field>
  return <Panel className="panel-pad stack"><div className="form-grid">
    <Field label={t("Registration")}><select className="select" value={draft.registrationMode} onChange={(event) => setDraft({ ...draft, registrationMode: event.target.value as PlatformSettings['registrationMode'] })}><option value="open">{t("Open")}</option><option value="invite">{t("Invitation only")}</option><option value="closed">{t("Closed")}</option></select></Field>
    <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={draft.resubmitPenaltyEnabled ?? false} onChange={(event) => setDraft({ ...draft, resubmitPenaltyEnabled: event.target.checked })} /> {t("Charge for resubmitting solved tasks")}</label>{number("resubmitPenaltyPercent", "Resubmission fee (%)")}{number("defaultNameLimit", "Names per user")}{number("defaultTaskNameLimit", "Names per submission")}{number("maxNameLength", "Maximum name length")}{number("runCooldownSeconds", "Run cooldown (seconds)")}{number("submitCooldownSeconds", "Submission cooldown (seconds)")}{number("defaultCoreOverrideLimit", "Core overrides per task")}{number("maxQueuedJobs", "Queue capacity")}
    {visibility("variables", "names", "Variable names")}{visibility("variables", "values", "Variable values")}{visibility("functions", "names", "Function names")}{visibility("functions", "values", "Function bodies and signatures")}
    <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={draft.solutionNotificationsEnabled ?? true} onChange={(event) => setDraft({ ...draft, solutionNotificationsEnabled: event.target.checked })} />{t('Solution notifications')}</label>
    <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={draft.dependencyCausalChecksEnabled ?? false} onChange={(event) => setDraft({ ...draft, dependencyCausalChecksEnabled: event.target.checked })} />{t('Dependency-based causal checks (risky fallback)')}</label>
    <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={draft.cheapInvariantChecksEnabled ?? false} onChange={(event) => setDraft({ ...draft, cheapInvariantChecksEnabled: event.target.checked })} />{t('Reduced invariant checks (risky fallback)')}</label>
    <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={draft.showBreakerIdentity ?? false} onChange={(event) => setDraft({ ...draft, showBreakerIdentity: event.target.checked })} />{t('Show who broke a solution')}</label>
    <Field label={t('Breaking impact')}><select className="select" value={draft.breakImpactVisibility ?? 'count'} onChange={(event) => setDraft({ ...draft, breakImpactVisibility: event.target.value as PlatformSettings['breakImpactVisibility'] })}><option value="hidden">{t('Hidden')}</option><option value="count">{t('Player count')}</option><option value="usernames">{t('Logins')}</option></select></Field>
  </div>
    <p className="muted">{t("Hidden names also hide their values. Administrators can always inspect the entire world.")}</p>
    <p className="muted">{t('Worker overload fallbacks are off by default. Dependency mode limits causal comparisons to potentially affected solutions; reduced invariant checks trade coverage for speed. Enable only when needed.')}</p>
    <Field label={t("Allowed words")}><textarea className="textarea mono" rows={6} value={allowed} onChange={(event) => setAllowed(event.target.value)} placeholder={t("One word per line, or CSV")} /></Field>
    <label className="row wrap" style={{ gap: 12 }}>{t("Import dictionary CSV")}<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1_000_000) { toast('error', 'Dictionary must be smaller than 1 MB.'); return }; setAllowed(words(await file.text()).join('\n')) }} /></label>
    <Field label={t("Denied words")}><textarea className="textarea mono" rows={4} value={denied} onChange={(event) => setDenied(event.target.value)} placeholder={t("One term per line")} /></Field>
    <div className="row wrap" style={{ gap: 10 }}>{OPERATIONS.map((operation) => <label className="filter-chip" key={operation}><input type="checkbox" checked={draft.permittedOverrides.includes(operation)} onChange={(event) => setDraft({ ...draft, permittedOverrides: event.target.checked ? [...draft.permittedOverrides, operation] : draft.permittedOverrides.filter((item) => item !== operation) })} /> @{operation}{operation === 'contains' && <span className="dim"> · {t('Disabled by default')}</span>}</label>)}</div>
    <div className="row wrap" style={{ gap: 10 }}><GlowButton variant="primary" loading={action.busy} onClick={() => action.run(() => api.saveSettings({ ...draft, allowedWords: words(allowed), denyWords: denied.split(/\r?\n/).map((term) => term.trim()).filter(Boolean) }))}>{t("Save settings")}</GlowButton>
      <GlowButton variant="danger" disabled={action.busy} onClick={() => { if (window.confirm(t('Restore every core operation to its default implementation? Existing solutions will be rechecked.'))) action.run(() => api.restoreOverrides(), 'Core operations restored.') }}>{t("Restore all core defaults")}</GlowButton>
    </div>
    <div className="row wrap" style={{ gap: 6 }}>{OPERATIONS.map((operation) => <button className="filter-chip" key={operation} disabled={action.busy} title={t('Restore @{operation} to its default', { operation })} onClick={() => action.run(() => api.restoreOverrides([operation]), t('@{operation} restored.', { operation }))}>{t("Restore @")}{operation}</button>)}</div>
    {action.error && <ErrorNotice message={action.error} />}
  </Panel>
}

function Users({ currentId }: { currentId: string }) {
  const { locale } = useLocale()
  const query = useQuery({ queryKey: ['admin', 'users'], queryFn: api.adminUsers })
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<User | null>(null)
  const [password, setPassword] = useState('')
  const [purgeState, setPurgeState] = useState(false)
  const tasks = useQuery({ queryKey: ['admin', 'tasks'], queryFn: api.adminTasks })
  const action = useAction()
  return <Panel className="panel-pad stack"><input className="input" aria-label={t("Search users")} placeholder={t("Search users")} value={search} onChange={(event) => setSearch(event.target.value)} />
    {query.isLoading && <Loading />}{query.error && <ErrorNotice message={message(query.error)} />}
    <div className="table-wrap"><table className="data-table"><thead><tr><th>{t("User")}</th><th>{t("Role")}</th><th>{t("Names")}</th><th>{t("Rating")}</th><th>{t("Status")}</th><th /></tr></thead><tbody>{query.data?.filter((user) => user.username.toLowerCase().includes(search.toLowerCase())).map((user) => <tr key={user.id}><td>{user.username}</td><td>{t(user.role === 'admin' ? 'Administrator' : 'Player')}</td><td>{user.usedNames ?? 0} / {user.nameLimit ?? t("default")}</td><td>{formatNumber(user.rating)}</td><td>{user.banned ? t("Banned") : t("Active")}</td><td><GlowButton size="sm" onClick={() => { setEditing(user); setPassword(''); setPurgeState(false) }}>{t("Manage")}</GlowButton></td></tr>)}</tbody></table></div>
    {editing && <div className="notice stack"><div className="row-between"><strong>{editing.username}</strong><GlowButton size="sm" onClick={() => setEditing(null)}>{t("Close")}</GlowButton></div><div className="form-grid">
      <Field label={t("Login")}><input className="input" value={editing.username} onChange={(event) => setEditing({ ...editing, username: event.target.value })} /></Field><Field label={t("Points")}><input className="input" type="number" value={editing.rating} onChange={(event) => setEditing({ ...editing, rating: Number(event.target.value) })} /></Field><Field label={t("Role")}><select className="select" value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value as User['role'] })}><option value="user">{t("Player")}</option><option value="admin">{t("Administrator")}</option></select></Field>
      <Field label={t("Name limit")}><input className="input" type="number" min="0" value={editing.nameLimit ?? 100} onChange={(event) => setEditing({ ...editing, nameLimit: Number(event.target.value) })} /></Field>
      <Field label={t("Private note")}><input className="input" value={editing.adminNote ?? ''} onChange={(event) => setEditing({ ...editing, adminNote: event.target.value })} /></Field>
      <label className="row" style={{ gap: 8 }}><input type="checkbox" disabled={editing.id === currentId} checked={editing.banned ?? false} onChange={(event) => setEditing({ ...editing, banned: event.target.checked })} /> {t("Ban account and revoke sessions")}</label>
      {editing.banned && <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={purgeState} onChange={(event) => setPurgeState(event.target.checked)} /> {t("Remove their shared definitions and restore their operators")}</label>}
    </div><details><summary>{t("Solved tasks")}</summary><div className="row wrap" style={{ gap: 8 }}>{tasks.data?.map((task) => <label className="filter-chip" key={task.id}><input type="checkbox" checked={editing.solvedTaskIds?.includes(task.id) ?? false} onChange={(event) => setEditing({ ...editing, solvedTaskIds: event.target.checked ? [...(editing.solvedTaskIds ?? []), task.id] : (editing.solvedTaskIds ?? []).filter((id) => id !== task.id) })} />{localizeTask(task, locale).title}</label>)}</div></details><GlowButton variant="primary" loading={action.busy} onClick={() => action.run(() => api.updateUser(editing.id, { ...Object.fromEntries(Object.entries({ username: editing.username, rating: editing.rating, solvedTaskIds: editing.solvedTaskIds, role: editing.role, adminNote: editing.adminNote, nameLimit: editing.nameLimit, banned: editing.banned }).filter(([key, value]) => value !== query.data?.find((item) => item.id === editing.id)?.[key as keyof User])), ...(editing.banned && purgeState ? { purgeState: true, banned: true } : {}) }))}>{t("Save user")}</GlowButton>
    <div className="row wrap" style={{ gap: 10 }}><input className="input" style={{ flex: 1 }} aria-label={t("New password")} type="password" autoComplete="new-password" placeholder={t("New password (at least 12 characters)")} value={password} onChange={(event) => setPassword(event.target.value)} /><GlowButton disabled={password.length < 12 || action.busy} onClick={() => action.run(async () => { await api.resetPassword(editing.id, password); setPassword('') }, 'Password reset and sessions revoked.')}>{t("Reset password")}</GlowButton></div>
    <GlowButton variant="danger" disabled={editing.id === currentId || action.busy} onClick={() => { if (window.confirm(t('Permanently delete {name}? This cannot be undone.', { name: editing.username }))) action.run(async () => { await api.deleteUser(editing.id); setEditing(null) }, 'User deleted.') }}>{t("Delete user")}</GlowButton></div>}
    {action.error && <ErrorNotice message={action.error} />}
  </Panel>
}

const NEW_TASK: Partial<AdminTask> = { title: '', slug: '', difficulty: 'easy', score: 50, statement: '', constraints: [], examples: [], starterCode: '@solution\nfn answer(value) {\n  return value;\n}', languageVersion: 'v0.3', addonPacks: ['core'], entryPoint: 'answer', timeLimitMs: 1000, tags: [], coreOverrideLimit: null, namePublishLimit: null, maxNameLength: null, allowedKeywords: null, visibility: 'visible', eventId: null, datacenterFire: false, tests: [{ input: [1], expected: 1, hidden: false }] }
function Tasks() {
  const { locale } = useLocale()
  const query = useQuery({ queryKey: ['admin', 'tasks'], queryFn: api.adminTasks })
  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: api.adminSettings })
  const events = useAdminNews()
  const [draft, setDraft] = useState<Partial<AdminTask> | null>(null)
  const [tests, setTests] = useState('[]')
  const [taskLocale, setTaskLocale] = useState<'en' | 'ru'>('en')
  const [allowed, setAllowed] = useState('')
  const action = useAction()
  const edit = (task: Partial<AdminTask>) => { setDraft({ ...task, translations: task.translations ?? { en: { title: task.title ?? '', statement: task.statement ?? '', constraints: task.constraints ?? [] } } }); setTaskLocale(task.translations?.en || !task.translations ? 'en' : 'ru'); setTests(JSON.stringify(task.tests ?? [], null, 2)); setAllowed(task.allowedWords?.join('\n') ?? '') }
  const update = (patch: Partial<AdminTask>) => setDraft((previous) => ({ ...previous, ...patch }))
  const text = draft?.translations?.[taskLocale] ?? { title: '', statement: '', constraints: [] }
  const translate = (patch: Partial<TaskTranslation>) => update({ translations: { ...draft?.translations, [taskLocale]: { ...text, ...patch } } })
  return <Panel className="panel-pad stack"><div className="row-between"><span>{query.data?.length ?? 0} {t("tasks")}</span><GlowButton size="sm" icon={<Plus size={13} />} onClick={() => edit({ ...NEW_TASK })}>{t("Create task")}</GlowButton></div>
    {query.error && <ErrorNotice message={message(query.error)} />}
    {!draft && <div className="stack">{query.data?.map((task) => <div className="row-between" key={task.id}><span>{localizeTask(task, locale).title} <Badge>{t(task.difficulty)}</Badge></span><GlowButton size="sm" onClick={() => edit(task)}>{t("Edit")}</GlowButton></div>)}</div>}
    {draft && <div className="stack"><div className="row wrap" style={{ gap: 8 }}>{(["en", "ru"] as const).map((language) => <button className={taskLocale === language ? 'filter-chip active' : 'filter-chip'} key={language} onClick={() => setTaskLocale(language)}>{language.toUpperCase()}{draft.translations?.[language]?.title ? ' +': ''}</button>)}<button className="filter-chip" onClick={() => { const translations = { ...draft.translations }; delete translations[taskLocale]; update({ translations }) }}>{t("Remove translation")}</button></div><div className="form-grid"><Field label={t("Title")}><input className="input" value={text.title} onChange={(event) => translate({ title: event.target.value })} /></Field><Field label={t("Slug")}><input className="input" value={draft.slug} onChange={(event) => update({ slug: event.target.value })} /></Field>
      <Field label={t("Difficulty")}><select className="select" value={draft.difficulty} onChange={(event) => update({ difficulty: event.target.value as AdminTask['difficulty'] })}>{["easy", "medium", "hard", "nightmare"].map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></Field>
      <Field label={t("Score")}><input className="input" type="number" min="0" value={draft.score} onChange={(event) => update({ score: Number(event.target.value) })} /></Field>
      <Field label={t("Time limit (ms)")}><input className="input" type="number" min="1" value={draft.timeLimitMs} onChange={(event) => update({ timeLimitMs: Number(event.target.value) })} /></Field><Field label={t("Core override limit")}><input className="input" type="number" min="0" placeholder={t("Global: {count}", { count: settings.data?.defaultCoreOverrideLimit ?? 2 })} value={draft.coreOverrideLimit ?? ""} onChange={(event) => update({ coreOverrideLimit: event.target.value === "" ? null : Number(event.target.value) })} /></Field><Field label={t("Names per submission")}><input className="input" type="number" min="0" placeholder={t("Global: {count}", { count: settings.data?.defaultTaskNameLimit ?? 30 })} value={draft.namePublishLimit ?? ""} onChange={(event) => update({ namePublishLimit: event.target.value === "" ? null : Number(event.target.value) })} /></Field>
      <Field label={t('Maximum name length')}><input className="input" type="number" min="1" max="128" placeholder={t('Global: {count}', { count: settings.data?.maxNameLength ?? 48 })} value={draft.maxNameLength ?? ''} onChange={(event) => update({ maxNameLength: event.target.value === '' ? null : Number(event.target.value) })} /></Field>
      <Field label={t('Task visibility')}><select className="select" value={draft.visibility ?? 'visible'} onChange={(event) => update({ visibility: event.target.value as AdminTask['visibility'] })}><option value="visible">{t('Visible')}</option><option value="hidden">{t('Hidden')}</option><option value="event">{t('Follow event')}</option></select></Field>
      {draft.visibility === 'event' && <Field label={t('Visibility event')}><select className="select" value={draft.eventId ?? ''} onChange={(event) => update({ eventId: event.target.value || null })}><option value="">{t('Select an event')}</option>{events.data?.filter((event) => event.category === 'event').map((event) => <option key={event.id} value={event.id}>{event.title}{event.visible === false ? ` · ${t('Hidden')}` : ''}</option>)}</select></Field>}
      <Field label={t("Tags")}><input className="input" value={draft.tags?.join(', ')} onChange={(event) => update({ tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></Field><Field label={t("Event ladder (optional)")}><input className="input" value={draft.ratingTable ?? ''} onChange={(event) => update({ ratingTable: event.target.value || undefined })} /></Field>
    </div><Field label={t("Problem statement")}><textarea className="textarea" rows={8} value={text.statement} onChange={(event) => translate({ statement: event.target.value })} /></Field>
    <Field label={t("Constraints (one per line)")}><textarea className="textarea" value={text.constraints?.join('\n')} onChange={(event) => translate({ constraints: event.target.value.split('\n').filter(Boolean) })} /></Field>
    <Field label={t("Starter code")}><textarea className="textarea mono" rows={8} value={draft.starterCode} onChange={(event) => update({ starterCode: event.target.value })} /></Field>
    <Field label={t("Tests (JSON: input argument array, expected value, hidden)")}><textarea className="textarea mono" rows={12} value={tests} onChange={(event) => setTests(event.target.value)} /></Field>
    <Field label={t("Task dictionary (blank uses the platform dictionary)")}><textarea className="textarea mono" rows={3} value={allowed} onChange={(event) => setAllowed(event.target.value)} /></Field>
    <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={draft.allowedKeywords != null} onChange={(event) => update({ allowedKeywords: event.target.checked ? [...TASK_KEYWORDS] : null })} />{t('Restrict language keywords')}</label>
    {draft.allowedKeywords != null && <div className="stack"><div className="row wrap" style={{ gap: 8 }}>{TASK_KEYWORDS.map((keyword) => <label className="filter-chip" key={keyword}><input type="checkbox" checked={draft.allowedKeywords?.includes(keyword)} onChange={(event) => update({ allowedKeywords: event.target.checked ? [...(draft.allowedKeywords ?? []), keyword] : draft.allowedKeywords?.filter((value) => value !== keyword) })} /><code>{keyword}</code></label>)}</div><span className="muted">{t('Checked keywords are allowed. fn and @solution remain available.')}</span></div>}
    <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={draft.datacenterFire ?? false} onChange={(event) => update({ datacenterFire: event.target.checked })} />{t('Datacenter fire')}</label>
    {draft.datacenterFire && <span className="muted">{t('Datacenter fire: a random line disappears from the editor while you work. Submissions run normally.')}</span>}
    {draft.visibility === 'event' && events.error && <ErrorNotice message={message(events.error)} />}
    <div className="row wrap" style={{ gap: 10 }}><GlowButton variant="primary" loading={action.busy} onClick={() => action.run(async () => { const parsed: AdminTask['tests'] = JSON.parse(tests); if (!Array.isArray(parsed) || !parsed.length || parsed.some((test) => !Array.isArray(test.input) || !Object.hasOwn(test, 'expected'))) throw new Error('Each test needs an input array and expected value.'); const translations = Object.fromEntries(Object.entries(draft.translations ?? {}).filter(([, value]) => value?.title.trim() || value?.statement.trim())); const canonical = translations.en ?? translations.ru; if (!canonical?.title.trim() || !canonical.statement.trim()) throw new Error('Add a title and statement in at least one language.'); const payload = { ...draft, ...canonical, translations: Object.fromEntries(Object.entries(translations).map(([locale, translation]) => [locale, { ...translation, examples: parsed.filter((test) => !test.hidden).map((test) => ({ input: JSON.stringify(test.input), output: JSON.stringify(test.expected) })) }])), tests: parsed, allowedWords: allowed.trim() ? words(allowed) : null, examples: parsed.filter((test) => !test.hidden).map((test) => ({ input: JSON.stringify(test.input), output: JSON.stringify(test.expected) })) }; if (draft.id) await api.updateTask(draft.id, payload); else await api.createTask(payload); setDraft(null) })}>{t("Save task")}</GlowButton><GlowButton onClick={() => setDraft(null)}>{t("Cancel")}</GlowButton>{draft.id && <GlowButton variant="danger" disabled={action.busy} onClick={() => { if (window.confirm(t('Delete this task?'))) action.run(async () => { await api.deleteTask(draft.id!); setDraft(null) }, 'Task deleted.') }}>{t("Delete")}</GlowButton>}</div></div>}
    {action.error && <ErrorNotice message={action.error} />}
  </Panel>
}

function Events() {
  useLocale()
  const query = useAdminNews()
  const [draft, setDraft] = useState<Partial<NewsItem>>({ title: '', body: '', category: 'event', accent: 'cyan', pinned: false, visible: true })
  const action = useAction()
  const update = (patch: Partial<NewsItem>) => setDraft((previous) => ({ ...previous, ...patch }))
  return <div className="admin-columns"><Panel className="panel-pad stack"><Field label={t("Title")}><input className="input" value={draft.title} onChange={(event) => update({ title: event.target.value })} /></Field><Field label={t("Message")}><textarea className="textarea" rows={8} value={draft.body} onChange={(event) => update({ body: event.target.value })} /></Field>
    <div className="form-grid"><Field label={t("Category")}><select className="select" value={draft.category} onChange={(event) => update({ category: event.target.value as NewsItem['category'] })}>{["event", "update", "maintenance", "holiday"].map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></Field><Field label={t("Accent")}><select className="select" value={draft.accent} onChange={(event) => update({ accent: event.target.value as NewsItem['accent'] })}>{["cyan", "magenta", "violet", "amber"].map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></Field>
    <Field label={t("Starts at (UTC)")}><input className="input" type="datetime-local" value={draft.startsAt?.slice(0, 16) ?? ''} onChange={(event) => update({ startsAt: event.target.value ? `${event.target.value}:00Z` : '' })} /></Field><Field label={t("Ends at (UTC)")}><input className="input" type="datetime-local" value={draft.endsAt?.slice(0, 16) ?? ''} onChange={(event) => update({ endsAt: event.target.value ? `${event.target.value}:00Z` : '' })} /></Field></div>
    <div className="form-grid"><Field label={t("Button text (optional)")}><input className="input" value={draft.cta?.label ?? ''} onChange={(event) => update({ cta: event.target.value ? { label: event.target.value, href: draft.cta?.href ?? '/tasks' } : null })} /></Field><Field label={t("Button destination")}><input className="input" placeholder={t("/tasks/shared-sum")} value={draft.cta?.href ?? ''} onChange={(event) => update({ cta: event.target.value ? { href: event.target.value, label: draft.cta?.label ?? 'View' } : null })} /></Field></div>
    <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={draft.pinned} onChange={(event) => update({ pinned: event.target.checked })} /> {t("Pin to feed")}</label>
    <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={draft.visible ?? true} onChange={(event) => update({ visible: event.target.checked })} />{t('Visible to players')}</label>
    <div className="row wrap" style={{ gap: 10 }}><GlowButton variant="primary" loading={action.busy} disabled={!draft.title?.trim()} onClick={() => action.run(async () => { if (draft.id) await api.updateNews(draft.id, draft); else await api.createNews(draft); setDraft({ title: '', body: '', category: 'event', accent: 'cyan', pinned: false }) }, draft.id ? 'Updated.' : 'Published.')}>{draft.id ? t("Save") : t("Publish")}</GlowButton><GlowButton onClick={() => setDraft({ title: '', body: '', category: 'event', accent: 'cyan', pinned: false })}>{t("Clear")}</GlowButton></div>{action.error && <ErrorNotice message={action.error} />}
  </Panel><Panel className="panel-pad stack">{query.error && <ErrorNotice message={message(query.error)} />}{query.data?.map((item) => <div className="news-admin-item" key={item.id}><div><Badge>{t(item.category)}</Badge><p>{item.title}</p><span className="dim">{formatRelative(item.createdAt)}</span></div><div className="row wrap" style={{ gap: 6 }}><GlowButton size="sm" onClick={() => setDraft(item)}>{t("Edit")}</GlowButton><GlowButton size="sm" variant="danger" onClick={() => { if (window.confirm(t('Delete {name}?', { name: item.title }))) action.run(() => api.deleteNews(item.id), 'Deleted.') }}>{t("Delete")}</GlowButton></div></div>)}</Panel></div>
}

function SubmissionFeed() {
  useLocale()
  const tasks = useTasks()
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
  return <Panel className="panel-pad stack"><div className="row-between wrap" style={{ gap: 12 }}><span>{historyOpen ? t("History · live updates paused; refresh to return to latest") : t("All player submissions · updates every 5 seconds")}</span><GlowButton size="sm" disabled={query.isFetching} icon={<RefreshCw size={13} />} onClick={() => client.resetQueries({ queryKey, exact: true })}>{t("Refresh")}</GlowButton></div>{query.error && <ErrorNotice message={message(query.error)} />}
    {query.isPending && <Loading label={t("Loading submissions…")} />}
    <div className="table-wrap"><table className="data-table"><thead><tr><th>{t("When")}</th><th>{t("Player")}</th><th>{t("Task")}</th><th>{t("Verdict")}</th><th>{t("Tests")}</th><th /></tr></thead><tbody>{submissions.map((submission) => <tr key={submission.id} className={submission.active === false ? "submission-inactive" : undefined}><td>{formatRelative(submission.createdAt)}</td><td>{submission.username}</td><td>{tasks.data?.find((task) => task.id === submission.taskId)?.title ?? submission.taskTitle}</td><td><StatusPill status={submission.status} /></td><td>{submission.testsPassed}/{submission.testsTotal}</td><td><GlowButton size="sm" onClick={() => setOpen(submission.id)}>{t("Inspect")}</GlowButton></td></tr>)}</tbody></table></div>
    {query.hasNextPage && <GlowButton loading={query.isFetchingNextPage} disabled={query.isRefetching} onClick={() => query.fetchNextPage()}>{t("Load older")}</GlowButton>}
    {!query.isPending && !submissions.length && !query.error && <p className="muted">{t("No submissions yet.")}</p>}
    {open && <SubmissionModal id={open} onClose={() => setOpen(null)} />}
  </Panel>
}

function Audit() {
  useLocale()
  const query = useQuery({ queryKey: ['admin', 'audit'], queryFn: api.audit, refetchInterval: 10000 })
  return <Panel className="panel-pad">{query.error && <ErrorNotice message={message(query.error)} />}<div className="table-wrap"><table className="data-table"><thead><tr><th>{t("When")}</th><th>{t("Administrator")}</th><th>{t("Action")}</th><th>{t("Target")}</th></tr></thead><tbody>{query.data?.map((entry) => <tr key={entry.id}><td>{formatRelative(entry.createdAt)}</td><td>{entry.actorId}</td><td>{entry.action}</td><td className="mono-cell">{entry.target}</td></tr>)}</tbody></table></div></Panel>
}
