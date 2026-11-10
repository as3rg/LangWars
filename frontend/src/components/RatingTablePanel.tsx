import { useRating } from '@/api/hooks'
import { formatRelative } from '@/lib/time'
import { Avatar, EmptyState, ErrorNotice, Loading } from './ui'

function renderExtra(value: string | number): string {
  if (typeof value === 'number') return String(value)
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatRelative(value)
  return value
}

export function RatingTablePanel({ tableId }: { tableId: string }) {
  const query = useRating(tableId)

  if (query.isLoading) return <Loading label="computing ladder…" />
  if (query.error) return <ErrorNotice message="Could not load rating table." />
  if (!query.data) return null

  const { descriptor, rows, me } = query.data

  return (
    <div>
      <div className="row-between wrap" style={{ marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18 }}>{descriptor.title}</h3>
          {descriptor.description && (
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
              {descriptor.description}
            </div>
          )}
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="badge badge-violet">{rows.length} cats</span>
          <span className="badge badge-cyan">dynamic columns</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No ranked cats yet">Be the first to submit on this table.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cat</th>
                <th style={{ textAlign: 'right' }}>Score</th>
                <th style={{ textAlign: 'right' }}>Solved</th>
                {descriptor.columns.map((column) => (
                  <th key={column.key} style={{ textAlign: column.align ?? 'left' }}>
                    {column.label}
                  </th>
                ))}
                <th style={{ textAlign: 'right' }}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isMe = row.userId === descriptor.highlightUserId
                const hue = (row.username.length * 47) % 360
                return (
                  <tr key={row.userId} className={isMe ? 'me-row' : undefined}>
                    <td className={`rank rank-${row.rank <= 3 ? row.rank : 'none'}`}>
                      {row.rank <= 3 ? ['★', '◆', '●'][row.rank - 1] : row.rank}
                    </td>
                    <td>
                      <span className="user-cell">
                        <Avatar username={row.username} hue={hue} />
                        {row.username}
                        {isMe && <span className="badge badge-cyan">you</span>}
                      </span>
                    </td>
                    <td className="score-cell" style={{ textAlign: 'right' }}>
                      {row.score}
                    </td>
                    <td className="mono-cell" style={{ textAlign: 'right' }}>
                      {row.solved}
                    </td>
                    {descriptor.columns.map((column) => (
                      <td
                        key={column.key}
                        className="mono-cell"
                        style={{ textAlign: column.align ?? 'left' }}
                      >
                        {renderExtra(row.extra[column.key] ?? '—')}
                      </td>
                    ))}
                    <td
                      className="mono-cell"
                      style={{
                        textAlign: 'right',
                        color:
                          row.delta && row.delta > 0
                            ? 'var(--cyan)'
                            : row.delta && row.delta < 0
                              ? 'var(--magenta)'
                              : 'var(--dim)',
                      }}
                    >
                      {row.delta === undefined ? '—' : row.delta > 0 ? `+${row.delta}` : row.delta}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!me && (
        <div className="rating-note">You are not on this ladder yet. Solve the task to enter.</div>
      )}
    </div>
  )
}
