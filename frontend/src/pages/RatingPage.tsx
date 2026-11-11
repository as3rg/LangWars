import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { useRatingTables, useTasks } from '@/api/hooks'
import { RatingTablePanel } from '@/components/RatingTablePanel'
import { ErrorNotice, Loading, Panel } from '@/components/ui'
import { t, useLocale } from '@/lib/i18n'

export function RatingPage() {
  useLocale()
  const tables = useRatingTables()
  const tasks = useTasks()
  const [selected, setSelected] = useState('global')
  useEffect(() => { if (tables.data?.length && !tables.data.some((table) => table.id === selected)) setSelected(tables.data[0].id) }, [tables.data, selected])
  return <div className="stack"><div className="section-head"><h1 className="section-title"><Trophy size={20} color="var(--amber)" />{t('Rating')}</h1>
    {tables.data && tables.data.length > 1 && <select className="select table-select" aria-label={t('Rating scope')} value={selected} onChange={(event) => setSelected(event.target.value)}>{tables.data.map((table) => <option key={table.id} value={table.id}>{table.id === "global" ? t('All tasks') : table.id.startsWith("task:") ? tasks.data?.find((task) => task.id === table.id.slice(5))?.title ?? table.title : `${t('Event')} · ${table.title}`}</option>)}</select>}
  </div>{tables.isLoading && <Loading />}{tables.error && <ErrorNotice message={t('Could not load rating.')} />}{tables.data && <Panel className="panel-pad"><RatingTablePanel tableId={selected} /></Panel>}</div>
}
