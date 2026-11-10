import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { api } from '@/api/client'
import { useSession } from '@/api/hooks'
import { LanguageGuide } from '@/components/LanguageGuide'
import { Badge, ErrorNotice, GlowButton, Loading, Panel } from '@/components/ui'
import { visibleWorldEntries } from '@/lib/world'

export function WorldPage() {
  const { token, user } = useSession()
  const world = useQuery({ queryKey: ['namespace', token, user?.role ?? 'guest'], queryFn: api.namespace, refetchInterval: 10000 })
  const config = useQuery({ queryKey: ['config'], queryFn: api.config })
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<'values' | 'functions'>('values')
  const [limit, setLimit] = useState(50)
  const visibility = world.data?.visibility?.[kind === 'values' ? 'variables' : 'functions']
  const entries = visibleWorldEntries(world.data, kind).filter(([name]) => name.toLowerCase().includes(search.toLowerCase()))
  return <div className="stack"><div className="section-head"><div><h1 className="section-title">Shared world</h1><p className="muted">Accepted solutions share state. Administrators control which names and definitions can be inspected.</p></div><GlowButton size="sm" icon={<RefreshCw size={13} />} onClick={() => world.refetch()}>Refresh</GlowButton></div>
    <div className="row wrap" style={{ gap: 12 }}><input className="input" style={{ flex: 1 }} aria-label="Search shared names" placeholder="Find a name" value={search} onChange={(event) => setSearch(event.target.value)} /><Badge tone="cyan">revision {world.data?.version ?? '…'}</Badge></div>
    <div className="tabs"><button className={kind === 'values' ? 'tab active' : 'tab'} onClick={() => setKind('values')}>Variables</button><button className={kind === 'functions' ? 'tab active' : 'tab'} onClick={() => setKind('functions')}>Functions</button></div>
    {world.isLoading && <Loading />}{world.error && <ErrorNotice message={world.error instanceof Error ? world.error.message : 'Could not load shared state.'} />}
    <Panel className="panel-pad"><div className="stack">{entries.slice(0, limit).map(([name, value]) => visibility?.values ? <SharedValue key={`${kind}-${name}`} name={name} value={value} last={kind === 'functions' ? world.data?.last?.[name] : undefined} /> : <div className="notice row-between" key={name}><span className="mono">{name}</span><span className="dim">{kind === 'values' ? 'Value hidden' : 'Definition hidden'}</span></div>)}{world.data && !entries.length && <p className="muted">{!visibility?.names ? 'These names are visible to administrators only.' : search ? 'No matching names.' : `No published ${kind === 'values' ? 'variables' : 'functions'} yet.`}</p>}{entries.length > limit && <GlowButton onClick={() => setLimit((previous) => previous + 50)}>Show more ({entries.length - limit} remaining)</GlowButton>}</div></Panel>
    {config.data && <p className="muted">Names can contain up to {config.data.maxNameLength} characters, using dictionary words joined by underscores.</p>}
    <details className="panel panel-pad"><summary style={{ cursor: 'pointer' }}>Available words · {config.data?.allowedWords.length ?? 0}</summary><p className="mono muted" style={{ overflowWrap: 'anywhere', maxHeight: 300, overflow: 'auto' }}>{config.data?.allowedWords.join(', ')}</p></details>
    <Panel className="panel-pad"><LanguageGuide /></Panel>
  </div>
}

function SharedValue({ name, value, last }: { name: string; value: unknown; last?: unknown }) {
  const [open, setOpen] = useState(false)
  const source = value && typeof value === 'object' && 'source' in value && typeof value.source === 'string' ? value.source : undefined
  return <details className="notice" onToggle={(event) => setOpen(event.currentTarget.open)}><summary className="mono" style={{ cursor: 'pointer' }}>{name}</summary>{open && <><pre className="mono" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 400, overflow: 'auto' }}>{(source ?? JSON.stringify(value, null, 2)).slice(0, 100_000)}</pre>{last !== undefined && <p className="mono muted">Last result: {JSON.stringify(last).slice(0, 2000)}</p>}</>}</details>
}
