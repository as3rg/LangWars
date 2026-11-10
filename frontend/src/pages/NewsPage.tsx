import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Radio, Sparkles, TerminalSquare } from 'lucide-react'
import { useNews, useTasks } from '@/api/hooks'
import { Markdown } from '@/components/Markdown'
import { CatMascot } from '@/components/CatMascot'
import { Badge, ErrorNotice, LinkButton, Loading, Panel, PixelDivider } from '@/components/ui'
import { countdown, formatRelative } from '@/lib/time'

const CATEGORY_TONE = {
  event: 'magenta',
  update: 'cyan',
  maintenance: 'violet',
  holiday: 'amber',
} as const

export function NewsPage() {
  const news = useNews()
  const tasks = useTasks()

  const pinned = news.data?.find((item) => item.pinned)
  const feed = news.data?.filter((item) => !item.pinned) ?? []

  return (
    <div>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow row" style={{ gap: 8 }}>
            <Radio size={11} className="blink" />
            competitive LWLang arena
          </div>
          <h1>
            Write LWLang.
            <br />
            <span className="accent">Break the ladder.</span>
          </h1>
          <p>
            A neon terminal where the language itself grows with every task. Ship a solution, unlock
            new keywords, and let the addons judge your AST. Neko-9 is watching.
          </p>
          <div className="hero-actions">
            <LinkButton to="/tasks" variant="primary" size="lg" icon={<TerminalSquare size={15} />}>
              Browse tasks
            </LinkButton>
            <LinkButton to={pinned?.cta?.href ?? '/tasks'} size="lg" icon={<Sparkles size={15} />}>
              {pinned ? pinned.cta?.label ?? 'Current event' : 'Current event'}
            </LinkButton>
          </div>
        </div>
        <div className="hero-mascot">
          <CatMascot size={230} mood="happy" />
        </div>
      </section>

      {pinned && (
        <div className="event-strip">
          <div className="row wrap" style={{ gap: 12 }}>
            <Badge tone="amber">
              <CalendarDays size={11} /> {pinned.category}
            </Badge>
            <strong>{pinned.title}</strong>
            <span className="muted" style={{ fontSize: 13 }}>
              {pinned.body.replace(/[*#`>-]/g, '').slice(0, 92)}…
            </span>
          </div>
          <div className="row" style={{ gap: 14 }}>
            {pinned.endsAt && <span className="countdown">⏳ {countdown(pinned.endsAt)}</span>}
            <Link to={pinned.cta?.href ?? '/tasks'} className="row" style={{ gap: 4 }}>
              enter <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}

      <div className="section-head">
        <div>
          <div className="eyebrow">transmission log</div>
          <h2 className="section-title">News & events</h2>
          <div className="section-sub">
            Holiday takeovers, language drops and judge maintenance, straight from the arena.
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <Badge tone="cyan">{tasks.data?.length ?? '…'} tasks live</Badge>
          <Badge tone="violet">LWLang v0.3</Badge>
          <Badge tone="amber">mock judge</Badge>
        </div>
      </div>

      {news.isLoading && <Loading label="tuning into the feed…" />}
      {news.error && <ErrorNotice message="Could not load news from the mock backend." />}

      {news.data && (
        <div className="news-grid">
          {feed.map((item) => (
            <Panel key={item.id} className={`news-card accent-${item.accent} hover-glow`}>
              <div className="news-meta">
                <Badge tone={CATEGORY_TONE[item.category]}>{item.category}</Badge>
                <span className="mono dim" style={{ fontSize: 11 }}>
                  {formatRelative(item.createdAt)}
                </span>
              </div>
              <h3>{item.title}</h3>
              <Markdown text={item.body} className="news-body" />
              {item.cta && (
                <Link to={item.cta.href} className="cta">
                  {item.cta.label} <ArrowRight size={12} />
                </Link>
              )}
            </Panel>
          ))}
        </div>
      )}

      <PixelDivider />

      <div className="admin-columns">
        <Panel className="panel-pad">
          <div className="eyebrow">how the arena works</div>
          <h3 style={{ fontSize: 20, margin: '8px 0 14px' }}>Three moves, one ladder</h3>
          <ol className="md" style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 8 }}>
              <strong>Pick a task.</strong> Each one pins a LWLang version and a set of editor addons.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong>Write & submit.</strong> The editor runs AST and source passes; the mock judge
              returns a verdict, score and rating delta.
            </li>
            <li>
              <strong>Climb.</strong> Global, per-task and event ladders are generated by the backend,
              with extensible extra columns.
            </li>
          </ol>
        </Panel>

        <Panel className="panel-pad" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <CatMascot size={92} mood="idle" />
          <div>
            <div className="eyebrow">neko-9 // terminal cat</div>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 13.5 }}>
              “The mock backend is honest: same code, same verdict. The real judge is being built in a
              dedicated session. Until then, blame the cat.”
            </p>
            <div className="mono dim" style={{ fontSize: 11, marginTop: 8 }}>
              try <kbd>neko</kbd> / <kbd>nyanya</kbd> to sign in
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
