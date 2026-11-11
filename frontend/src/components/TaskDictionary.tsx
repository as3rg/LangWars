import { t, useLocale } from '@/lib/i18n'

export function TaskDictionary({ words }: { words: string[] }) {
  useLocale()
  if (!words.length) return null
  return <div className="task-dictionary">
    <p>{t('This task allows only these names:')}</p>
    <details>
      <summary><span className="dictionary-preview mono muted">{words.join(', ')}</span><span className="dictionary-expand">{t('Show all')}</span><span className="dictionary-collapse">{t('Collapse')}</span></summary>
      <p className="mono muted dictionary-full">{words.join(', ')}</p>
    </details>
  </div>
}
