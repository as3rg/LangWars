import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Filter, Search, Target } from 'lucide-react'
import { useTasks } from '@/api/hooks'
import type { Difficulty } from '@/api/types'
import { plural } from '@/lib/plural'
import {
  Badge,
  DifficultyBadge,
  EmptyState,
  ErrorNotice,
  Loading,
} from '@/components/ui'

const FILTERS: Array<{ id: 'all' | Difficulty; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
  { id: 'nightmare', label: 'Nightmare' },
]

export function TasksPage() {
  const tasks = useTasks()
  const [difficulty, setDifficulty] = useState<'all' | Difficulty>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const list = tasks.data ?? []
    const term = search.trim().toLowerCase()
    return list.filter((task) => {
      if (difficulty !== 'all' && task.difficulty !== difficulty) return false
      if (!term) return true
      return (
        task.title.toLowerCase().includes(term) ||
        task.slug.toLowerCase().includes(term) ||
        task.tags.some((tag) => tag.toLowerCase().includes(term))
      )
    })
  }, [tasks.data, difficulty, search])

  const solved = tasks.data?.filter((task) => task.solved).length ?? 0

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="eyebrow">arena registry</div>
          <h2 className="section-title">
            <Target size={20} color="var(--cyan)" /> Tasks
          </h2>
          <div className="section-sub">
            Every task can extend the language. Addons are listed on the task page.
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <Badge tone="cyan">
            <CheckCircle2 size={11} /> {solved} solved
          </Badge>
          <Badge tone="violet">{tasks.data?.length ?? '…'} total</Badge>
        </div>
      </div>

      <div className="filter-bar">
        <Filter size={14} color="var(--dim)" />
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            className={difficulty === filter.id ? 'filter-chip active' : 'filter-chip'}
            onClick={() => setDifficulty(filter.id)}
          >
            {filter.label}
          </button>
        ))}
        <div className="search-input row" style={{ padding: '0 10px' }}>
          <Search size={13} color="var(--dim)" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="search title, slug, tag…"
            aria-label="Search tasks"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12.5,
              outline: 'none',
              width: '100%',
              padding: '9px 0',
            }}
          />
        </div>
      </div>

      {tasks.isLoading && <Loading label="loading task registry…" />}
      {tasks.error && <ErrorNotice message="Could not load tasks." />}

      {tasks.data && filtered.length === 0 && (
        <EmptyState title="No tasks match">Try a different filter. The cat is picky.</EmptyState>
      )}

      <div className="task-grid">
        {filtered.map((task) => (
          <Link to={`/tasks/${task.id}`} key={task.id} className="panel task-card hover-glow">
            <div className="task-card-head">
              <div>
                <h3>{task.title}</h3>
                <div className="slug">{task.slug}</div>
              </div>
              <DifficultyBadge difficulty={task.difficulty} />
            </div>

            <div className="tag-row">
              {task.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>

            <div className="task-card-foot">
              <span className="row" style={{ gap: 8 }}>
                <span className="task-score">{task.score} pts</span>
                <span>{plural(task.solvedBy, 'solve')}</span>
                {task.solved && (
                  <span className="solved-check">
                    <CheckCircle2 size={12} /> solved
                  </span>
                )}
                {!task.solved && task.attempted && <span className="badge badge-amber">attempted</span>}
              </span>
              <span className="row" style={{ gap: 6 }}>
                <span className="badge badge-violet">{task.languageVersion}</span>
                <span className="badge">{plural(task.addonPacks.length, 'addon')}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
