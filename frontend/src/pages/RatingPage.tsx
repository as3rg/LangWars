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
            Track solutions that survive the shared world. Choose the global, task, or event ladder.
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
                {tables.data.find((t) => t.id === selected)?.description}
              </span>
            </div>
          </Panel>

          <Panel className="panel-pad">
            <RatingTablePanel tableId={selected} />
          </Panel>

          <p className="muted mt-24">Scores count distinct tasks with a currently passing solution. Shared-world changes trigger rechecks, so a solved task can become unsolved.</p>
        </>
      )}
    </div>
  )
}
