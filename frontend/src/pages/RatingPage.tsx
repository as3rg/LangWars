import { useEffect, useState } from 'react'
import { Layers, Trophy } from 'lucide-react'
import { useRatingTables } from '@/api/hooks'
import { RatingTablePanel } from '@/components/RatingTablePanel'
import { Badge, ErrorNotice, Loading, Panel } from '@/components/ui'

export function RatingPage() {
  const tables = useRatingTables()
  const [selected, setSelected] = useState('global')

  useEffect(() => {
    if (!tables.data || tables.data.length === 0) return
    if (!tables.data.some((table) => table.id === selected)) {
      setSelected(tables.data[0].id)
    }
  }, [tables.data, selected])

  return (
    <div>
      <div className="rating-head">
        <div>
          <div className="eyebrow">neon ladder</div>
          <h2 className="section-title">
            <Trophy size={20} color="var(--amber)" /> Rating
          </h2>
          <div className="section-sub">
            Backend-computed ladders with dynamic extra columns. Switch between global, per-task and
            event tables.
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <Badge tone="cyan">server-side ranking</Badge>
          <Badge tone="violet">
            <Layers size={10} /> {tables.data?.length ?? '…'} tables
          </Badge>
        </div>
      </div>

      {tables.isLoading && <Loading label="loading ladder descriptors…" />}
      {tables.error && <ErrorNotice message="Could not load rating tables." />}

      {tables.data && (
        <>
          <Panel className="panel-pad" style={{ marginBottom: 18 }}>
            <div className="row wrap" style={{ gap: 14 }}>
              <label className="mono dim" style={{ fontSize: 11 }} htmlFor="rating-table">
                TABLE
              </label>
              <select
                id="rating-table"
                className="select table-select"
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                {tables.data.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.title}
                  </option>
                ))}
              </select>
              <span className="rating-note" style={{ marginTop: 0 }}>
                extra columns come from the descriptor ({tables.data.find((t) => t.id === selected)?.columns.length ?? 0} on this table)
              </span>
            </div>
          </Panel>

          <Panel className="panel-pad">
            <RatingTablePanel tableId={selected} />
          </Panel>

          <div className="admin-grid mt-24">
            <Panel className="panel-pad">
              <div className="eyebrow">how deltas work</div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
                A submission response carries <code className="mono">ratingUpdate</code> with
                <code className="mono"> delta</code>, <code className="mono">newScore</code> and rank
                movement. The UI only renders it — all math is backend-owned.
              </p>
            </Panel>
            <Panel className="panel-pad">
              <div className="eyebrow">extensible tables</div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
                New event ladders just add a descriptor with their own columns. No frontend change is
                needed for extra info such as badges, streaks or best times.
              </p>
            </Panel>
            <Panel className="panel-pad">
              <div className="eyebrow">tie breakers</div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
                The mock sorts by score, then best time, then username. The real backend will own the
                tie-break policy and document it in the API spec.
              </p>
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
