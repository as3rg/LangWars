import { Link } from 'react-router-dom'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'

export function LanguageGuide() {
  const config = useQuery({ queryKey: ['config'], queryFn: api.config })
  return <details style={{ marginTop: 16 }}><summary style={{ cursor: 'pointer' }}>Language guide</summary>
    <pre className="mono" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{'@solution\nfn <int, int> my_answer(left, right) {\n  let total = left + right;\n  if (total = 42) {\n    return total;\n  }\n  return left;\n}'}</pre>
    <p className="muted">End statements with semicolons. Put conditions in parentheses. Equality is <code>=</code>; <code>==</code> is invalid. Logic uses <code>and</code>, <code>or</code>, and <code>not</code>. Loops use <code>while (condition) {'{ ... }'}</code>.</p>
    <p className="muted">Values are integers, strings, lists, and dictionaries. Integers wrap between −1,000,000 and 1,000,000. Division and remainder by zero return 42. Floating point values are unavailable.</p>
    <p className="muted">Use <code>get(collection, index)</code> for access; indices wrap around. <code>get([], index)</code> returns zero. <code>set</code> and <code>push_back</code> mutate lists. Reading an absent dictionary key inserts zero. Strings cannot be changed with <code>set</code>. Convert values with <code>int(value)</code>, <code>string(value)</code>, <code>list(value)</code>, or <code>dict(value)</code>.</p>
    <p className="muted">All names, including parameters, are global. Build names from dictionary words joined by underscores{config.data ? `, up to ${config.data.maxNameLength} characters` : ''}. Each program needs exactly one <code>@solution</code> function. A function used as a value gives its last return value; calling a variable gives its value.</p>
    <p className="muted">Permitted core annotations such as <code>@eq</code> change standard operations while preserving their contracts. Inside an override, <code>__builtin_eq__(left, right)</code> calls the original equality operation and <code>__builtin_concat__(left, right)</code> joins two strings using the original implementation. Overrides cannot call ordinary functions.</p>
    <p className="muted">Accepted submissions publish definitions. Changes trigger rechecks of affected solutions; a passing solution can become broken. Runs never publish. Administrators control which shared names and definitions are visible. <Link to="/world">Explore the world and available words.</Link></p>
  </details>
}
