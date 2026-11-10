import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { t, useLocale } from '@/lib/i18n'

export function LanguageGuide() {
  useLocale()
  const config = useQuery({ queryKey: ['config'], queryFn: api.config })
  const samples = [
    ['One entry point. Use = for equality, and/or/not for logic.', '@solution\nfn <int, int> answer(left, right) {\n  let total = left + right;\n  if (total = 42 and not (left = 0)) {\n    return total;\n  }\n  return 0;\n}'],
    ['Lists and strings wrap indices. set mutates; concat creates a string.', 'let items = [10, 20, 30];\nget(items, -1);       // 30\nset(items, 0, 99);\nget(items, 3);        // 99\nlet data = {"cat": 7};\nget(data, "dog");     // 0; inserts the key\nconcat("cat", "!");   // "cat!"'],
    ['while repeats. Types: int, string, list, dict. int("cat") is its length.', 'let index = 0;\nlet total = 0;\nwhile (index < length(items)) {\n  total = total + get(items, index);\n  index = index + 1;\n}\nint("cat");          // 3\nlet next = 1000000 + 1; // -1000000\nlet result = 7 / 0;   // 42'],
    ['Overrides change operations for everyone. Builtin calls are allowed only inside overrides.', '@eq\nfn <int, int> equal(left, right) {\n  return __builtin_eq__(left, right);\n}\n// ordinary code uses eq(left, right) or left = right'],
  ]
  return <details style={{ marginTop: 16 }}><summary style={{ cursor: 'pointer' }}>{t('LWLang in examples')}</summary><div className="stack" style={{ marginTop: 12 }}>{samples.map(([note, code]) => <div key={code}><p className="muted">{t(note)}</p><pre className="mono" style={{ whiteSpace: 'pre-wrap' }}>{code}</pre></div>)}</div>
    <p className="muted">{t('All names and parameters are global. A function used without () gives its last result. Accepted submissions publish changes; runs do not. Other players can break a passing solution.')}</p>
    <p className="muted">{t('Use dictionary words joined with underscores, up to {count} characters.', { count: config.data?.maxNameLength ?? 64 })} <Link to="/world">{t('See available names and words →')}</Link></p>
  </details>
}
