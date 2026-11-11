import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import type { Namespace } from '@/api/types'
import { useSession } from '@/api/hooks'
import { SubmissionModal } from '@/components/SubmissionModal'
import { Badge, ErrorNotice, GlowButton, Loading, Panel } from '@/components/ui'
import { visibleWorldEntries } from '@/lib/world'
import { t, useLocale } from '@/lib/i18n'

export function WorldPage() {
  useLocale()
  const { token, user, isAdmin } = useSession()
  const client = useQueryClient()
  const world = useQuery({ queryKey: ['namespace', token, user?.role ?? 'guest'], queryFn: api.namespace, refetchInterval: 10000 })
  const config = useQuery({ queryKey: ['config'], queryFn: api.config })
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<'values' | 'functions'>('values')
  const [limit, setLimit] = useState(50)
  const [editing, setEditing] = useState<{ name: string; kind: 'variable' | 'function' | 'last'; text: string; version: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [openSubmission, setOpenSubmission] = useState<string | null>(null)
  const visibility = world.data?.visibility?.[kind === 'values' ? 'variables' : 'functions']
  const entries = visibleWorldEntries(world.data, kind).filter(([name]) => name.toLowerCase().includes(search.toLowerCase()))
  const edit = (name: string, value: unknown, target: 'variable' | 'function' | 'last') => {
    const source = value && typeof value === 'object' && 'source' in value && typeof value.source === 'string' ? value.source : ''
    setEditing({ name, kind: target, version: world.data!.version, text: target === 'function' ? source : JSON.stringify(value ?? 0, null, 2) }); setError('')
  }
  const change = async (remove = false) => {
    if (!editing || busy) return
    setBusy(true); setError('')
    try {
      if (remove) await api.deleteWorld(editing.name, editing.version)
      else if (editing.kind === 'function') await api.editWorld(editing.name, { version: editing.version, kind: 'function', code: editing.text })
      else await api.editWorld(editing.name, { version: editing.version, kind: editing.kind, value: JSON.parse(editing.text) })
      setEditing(null); await client.invalidateQueries()
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')) }
    finally { setBusy(false) }
  }
  return <div className="stack"><div className="section-head"><h1 className="section-title">{t('Shared world')}</h1><div className="row" style={{ gap: 8 }}>{isAdmin && <GlowButton size="sm" onClick={() => edit('', kind === 'values' ? 0 : null, kind === 'values' ? 'variable' : 'function')}>{t('Add')}</GlowButton>}<GlowButton size="sm" icon={<RefreshCw size={13} />} onClick={() => world.refetch()}>{t('Refresh')}</GlowButton></div></div>
    <div className="row wrap" style={{ gap: 12 }}><input className="input" style={{ flex: 1 }} aria-label={t('Search shared names')} placeholder={t('Find a name')} value={search} onChange={(event) => setSearch(event.target.value)} /><Badge tone="cyan">{t('revision')} {world.data?.version ?? '…'}</Badge></div>
    <div className="tabs"><button className={kind === 'values' ? 'tab active' : 'tab'} onClick={() => setKind('values')}>{t('Variables')}</button><button className={kind === 'functions' ? 'tab active' : 'tab'} onClick={() => setKind('functions')}>{t('Functions')}</button></div>
    {world.isLoading && <Loading />}{world.error && <ErrorNotice message={world.error instanceof Error ? world.error.message : t('Could not load shared state.')} />}
    {editing && <Panel className="panel-pad stack"><div className="row wrap" style={{ gap: 8 }}><input className="input mono" aria-label={t('Name')} placeholder={t('Name')} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /><select className="select" aria-label={t('Type')} value={editing.kind} onChange={(event) => setEditing({ ...editing, kind: event.target.value as typeof editing.kind })}><option value="variable">{t('Variable')}</option><option value="function">{t('Function')}</option><option value="last">{t('Last result')}</option></select></div><textarea className="textarea mono" rows={12} aria-label={editing.kind === "function" ? t('LWLang definition') : t('Value (JSON)')} placeholder={editing.kind === "function" ? t("fn answer(value) { return value; }") : t("42, \"cat\", [1, 2], {\"$dict\": [[\"cat\", 7]]}")} value={editing.text} onChange={(event) => setEditing({ ...editing, text: event.target.value })} /><div className="row wrap" style={{ gap: 8 }}><GlowButton variant="primary" loading={busy} disabled={!editing.name.trim()} onClick={() => change()}>{t('Save')}</GlowButton><GlowButton disabled={busy} onClick={() => setEditing(null)}>{t('Cancel')}</GlowButton><GlowButton variant="danger" disabled={busy || !editing.name.trim()} onClick={() => { if (window.confirm('Delete this shared name and recheck affected solutions?')) change(true) }}>{t('Delete')}</GlowButton></div>{error && <ErrorNotice message={error} />}</Panel>}
    <Panel className="panel-pad"><div className="stack">{entries.slice(0, limit).map(([name, value]) => visibility?.values ? <SharedValue key={`${kind}-${name}`} name={name} value={value} owner={isAdmin ? world.data?.ownership?.[name] : undefined} onOpenOwner={setOpenSubmission} last={kind === 'functions' ? world.data?.last?.[name] : undefined} onEdit={isAdmin ? () => edit(name, value, kind === 'values' ? 'variable' : 'function') : undefined} onEditLast={isAdmin && kind === 'functions' ? () => edit(name, world.data?.last?.[name], 'last') : undefined} /> : <div className="notice row-between" key={name}><span className="mono">{name}</span><span className="dim">{t(kind === "values" ? t("Value hidden") : t("Definition hidden"))}</span></div>)}{world.data && !entries.length && <p className="muted">{t(!visibility?.names ? t("These names are visible to administrators only.") : search ? t("No matching names.") : t("No published names yet."))}</p>}{entries.length > limit && <GlowButton onClick={() => setLimit((previous) => previous + 50)}>{t('Show more')} ({entries.length - limit})</GlowButton>}</div></Panel>
    {config.data && <p className="muted">{t('Use dictionary words joined with underscores, up to {count} characters.', { count: config.data.maxNameLength })}</p>}
    <details className="panel panel-pad"><summary style={{ cursor: 'pointer' }}>{t('Available words')} · {config.data?.allowedWords.length ?? 0}</summary><p className="mono muted" style={{ overflowWrap: 'anywhere', maxHeight: 300, overflow: 'auto' }}>{config.data?.allowedWords.join(', ')}</p></details>
    <Link to="/guide">{t('LWLang guide')} →</Link>
    {openSubmission && <SubmissionModal id={openSubmission} onClose={() => setOpenSubmission(null)} />}
  </div>
}
function SharedValue({ name, value, last, onEdit, onEditLast, owner, onOpenOwner }: { name: string; value: unknown; last?: unknown; onEdit?: () => void; onEditLast?: () => void; owner?: NonNullable<Namespace['ownership']>[string]; onOpenOwner?: (id: string) => void }) {
  useLocale()
  const [open, setOpen] = useState(false)
  const source = value && typeof value === 'object' && 'source' in value && typeof value.source === 'string' ? value.source : undefined
  return <details className="notice" onToggle={(event) => setOpen(event.currentTarget.open)}><summary className="mono" style={{ cursor: 'pointer' }}>{name}{owner && <span className="world-owner" onClick={(event) => { event.stopPropagation(); event.preventDefault() }}><button className="filter-chip" onClick={() => onOpenOwner?.(owner.submissionId)} title={t('View submission')}>{owner.username ?? t('Submission')} {owner.taskTitle ? ` / ${owner.taskTitle}` : ` #${owner.submissionId.slice(0, 8)}`}</button>{owner.taskId && <Link to={`/tasks/${owner.taskId}`} onClick={(event) => event.stopPropagation()}>{t('Task')} &#8599;</Link>}</span>}</summary>{open && <><pre className="mono" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 400, overflow: 'auto' }}>{(source ?? JSON.stringify(value, null, 2)).slice(0, 100_000)}</pre>{last !== undefined && <p className="mono muted">{t('Last result')}: {JSON.stringify(last).slice(0, 2000)}</p>}{onEdit && <div className="row" style={{ gap: 8 }}><GlowButton size="sm" onClick={onEdit}>{t('Edit')}</GlowButton>{onEditLast && <GlowButton size="sm" onClick={onEditLast}>{t('Edit last result')}</GlowButton>}</div>}</>}</details>
}
