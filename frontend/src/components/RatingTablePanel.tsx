import { useState } from 'react'
import { useRating } from '@/api/hooks'
import { t, useLocale } from '@/lib/i18n'
import { formatRelative } from '@/lib/time'
import { Avatar, EmptyState, ErrorNotice, Loading } from './ui'

function renderExtra(value: string | number): string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) ? formatRelative(value) : String(value) }
export function RatingTablePanel({ tableId }: { tableId: string }) {
  useLocale()
  const [search, setSearch] = useState('')
  const query = useRating(tableId, search)
  const columns = query.data?.descriptor.columns.filter((column) => !['score', 'solved', 'delta'].includes(column.key)) ?? []
  return <div className="stack"><input className="input" aria-label={t('Find a player')} placeholder={t('Find a player')} value={search} onChange={(event) => setSearch(event.target.value)} />
    {query.isLoading && <Loading />}{query.error && <ErrorNotice message={t('Could not load rating.')} />}
    {query.data && (!query.data.rows.length ? <EmptyState title={t(search ? t("No matching players") : t("No ranked players yet"))} /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>#</th><th>{t('Player')}</th><th style={{ textAlign: 'right' }}>{t('Points')}</th><th style={{ textAlign: 'right' }}>{t('Solved')}</th>{columns.map((column) => <th key={column.key} style={{ textAlign: column.align ?? 'left' }}>{t(column.label)}</th>)}</tr></thead><tbody>{query.data.rows.map((row) => <tr key={row.userId} className={row.userId === query.data!.me?.userId ? 'me-row' : undefined}><td className={`rank rank-${row.rank <= 3 ? row.rank : 'none'}`}>{row.rank}</td><td><span className="user-cell"><Avatar username={row.username} hue={(row.username.length * 47) % 360} />{row.username}{row.userId === query.data!.me?.userId && <span className="badge badge-cyan">{t('you')}</span>}</span></td><td className="score-cell" style={{ textAlign: 'right' }}>{row.score}</td><td className="mono-cell" style={{ textAlign: 'right' }}>{row.solved}</td>{columns.map((column) => <td key={column.key} className="mono-cell" style={{ textAlign: column.align ?? 'left' }}>{renderExtra(row.extra[column.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>)}
  </div>
}
