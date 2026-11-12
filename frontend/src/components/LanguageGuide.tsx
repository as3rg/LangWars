import { Link } from 'react-router-dom'
import { Panel } from './ui'
import { t, useLocale } from '@/lib/i18n'

export const guideExamples = [
  '@solution\nfn <int, int> answer(left, right) {\n  return left + right;\n}',
  '@solution\nfn <list> answer(items) {\n  let index = 0;\n  let total = 0;\n  while (index < length(items)) {\n    total = total + get(items, index);\n    index = index + 1;\n  }\n  return total;\n}',
  'fn keep(number) {\n  return number + 1;\n}\n@solution\nfn answer(value) {\n  keep(value);\n  return keep;\n}',
  'let shared = 10;\n@solution\nfn answer() {\n  return shared;\n}',
  '@solution\nfn next_answer() {\n  let shared = 99;\n  return shared;\n}',
  '@eq\nfn <int, int> equal(left, right) {\n  return __builtin_eq__(left, right);\n}\n@solution\nfn answer(left, right) {\n  return eq(left, right);\n}',
]

const lessons = [
  ['Start with one @solution function. The task supplies its arguments and checks its return value. Types are int, string, list and dict.',
    'Use = for equality and and/or/not for logic. Integers wrap between −1000000 and 1000000; division by zero returns 42.'],
  ['Use while for loops. get and set wrap list and string indices, so get([10, 20], -1) returns 20. concat("cat", "!") returns "cat!".',
    'Even these familiar operations can be changed by other players. Passing sample tests does not guarantee that a submission will pass all tests.'],
  ['Variables and helper functions are global. Parameters shadow shared names during a call; argument bindings do not publish. Explicit let declarations and assignments publish even when they use a parameter name. A function name without () gives its last return value; it is not a function reference.',
    'Choose dictionary words joined with underscores. Your task shows the available words and your remaining name budget.'],
  ['An accepted submission publishes its names into the shared world. Run only checks samples and publishes nothing. Suppose your accepted solution expects 10:',
    'Another player then submits this passing solution to a different task. It publishes shared = 99. Your solution is checked again against the changed world and can become broken.'],
  ['Stdlib overrides also affect everyone. This @eq definition keeps equality unchanged; allowed overrides must pass their contracts.',
    'Builtin escape calls are available only inside stdlib overrides. Ordinary helpers and @solution functions must use the shared operations.'],
]

export function LanguageGuide() {
  useLocale()
  return <div className="language-guide stack">
    {lessons.map(([intro, after], index) => <Panel className="panel-pad" key={intro}>
      <p>{t(intro)}</p>
      <pre className="guide-code mono"><code>{guideExamples[index === 4 ? 5 : index]}</code></pre>
      <p className="muted">{t(after)}</p>
      {index === 3 && <pre className="guide-code mono"><code>{guideExamples[4]}</code></pre>}
      {index === 4 && <p className="muted">{t('Administrators can change which operations may be overridden. contains overrides are disabled by default.')}</p>}
    </Panel>)}
    <Link to="/world">{t('Explore shared names and available words →')}</Link>
    <Link to="/tasks">{t('Tasks')} →</Link>
  </div>
}
