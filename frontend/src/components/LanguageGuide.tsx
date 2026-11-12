import { Link } from 'react-router-dom'
import { Panel } from './ui'
import { GuideCode } from './GuideCode'
import { t, useLocale } from '@/lib/i18n'

export const guideExamples = [
  '@solution\nfn answer(left, right) {\n  return left + right;\n}',
  '@solution\nfn answer(items) {\n  let index = 0;\n  let total = 0;\n  while (index < length(items)) {\n    total = total + get(items, index);\n    index = index + 1;\n  }\n  return total;\n}',
  'fn keep(number) {\n  return number + 1;\n}\n@solution\nfn answer(value) {\n  keep(value);\n  return keep;\n}',
  'let shared = 10;\n@solution\nfn answer() {\n  return shared;\n}',
  '@solution\nfn next_answer() {\n  let shared = 99;\n  return shared;\n}',
  '@eq\nfn <int, int> equal(left, right) {\n  return __builtin_eq__(left, right);\n}\n@solution\nfn answer(left, right) {\n  return eq(left, right);\n}',
  'fn keep(first, second) {\n  return first + second;\n}\n@solution\nfn answer() {\n  let value = 7;\n  return keep(value());\n}',
  '@solution\nfn answer() {\n  target:\n  return 10;\n  comefrom target;\n  return 42;\n}',
  'fn <int> keep(number) {\n  return number;\n}\n@solution\nfn answer() {\n  return keep("cat");\n}',
  '@cast(list)\nfn <int> make_list(number) {\n  return [42];\n}\n@solution\nfn answer(value) {\n  return list(value);\n}',
]

const stdlib = [
  ['eq(a, b), cmp(a, b)', 'Equality returns 0 or 1; comparison returns −1, 0 or 1. = and != use eq; <, <=, > and >= use cmp.'],
  ['get(container, key)', 'Read a string, list or dictionary. List and string indices wrap: get([10, 20], -1) returns 20. Empty lists return 0; empty strings return "". A missing dictionary key is inserted with value 0.'],
  ['set(container, key, value)', 'Mutate a list or dictionary. List indices wrap; setting an empty list creates its first element. Strings cannot be mutated.'],
  ['length(container), empty(container)', 'Get the size or a 0/1 emptiness result for a string, list or dictionary. Dictionary size counts distinct keys.'],
  ['contains(container, value)', 'Test a substring, list element or dictionary key; return 0 or 1.'],
  ['push_back(items, value)', 'Append to a list in place. set and push_back return 0; inspect the mutated container for the result.'],
  ['concat(left, right)', 'Return a new string, converting both arguments to strings when necessary.'],
  ['truthy(value)', 'Return 0 for 0, "", [] and {}; return 1 for other values by default. Conditions and and/or/not use this operation.'],
  ['int(value), string(value), list(value), dict(value)', 'Explicitly convert a value using the same conversion rules as implicit casts.'],
]

const casts = [
  ['int', '123 → "123"', 'n → [n]', 'n → {n: n}', 'Unchanged'],
  ['string', 'Unchanged', '"cat" → ["c", "a", "t"]', 's → {s: s}', 'String length: int("123") → 3'],
  ['list', '[1, 2] → "[1,2]"', 'Unchanged', '[1, 2] → {1: 1, 2: 2}', 'Sum of elements after conversion to int'],
  ['dict', '{1: 2} → "{1:2}"', '{1: 2} → [1, 2]', 'Unchanged', 'Sum of key × value after conversion to int'],
]

const contracts = [
  ['@eq', '=, !=, eq(a, b)', 'eq(a,a) ≡ 1\n(eq(a,b) ∧ eq(b,c)) ⇒ eq(a,c)\n(a != b) ≡ ¬eq(a,b)', 'Return int 0 or 1.'],
  ['@cmp', '<, <=, >, >=, cmp(a, b)', 'a ≤ a; ¬(a < a)\n(a ≤ b ∧ b ≤ a) ⇔ eq(a,b)\n(a ≤ b ∧ b ≤ c) ⇒ a ≤ c\n(a < b ∧ b < c) ⇒ a < c', 'Return int −1, 0 or 1.'],
  ['@get', 'get(a, i)', '{get(a,i) | i ∈ 0…|a|−1} ≡ set(a)', 'Reading preserves the collection of values.'],
  ['@set', 'set(a, i, v)', 'set(a,i,v) → a′\nget(a′,i) ≡ v', 'Mutation must preserve the select-store law.'],
  ['@length', 'length(a)', 'length(a) ≥ 0', 'Return a nonnegative int. Dictionary length counts distinct keys.'],
  ['@empty', 'empty(a)', 'empty(a) ⇒ length(a) = 0', 'Return int 0 or 1.'],
  ['@contains', 'contains(a, x)', 'contains(a,x) ∈ {0,1}', 'Return int 0 or 1. Overrides are disabled by default; administrators may enable them.'],
  ['@push_back', 'push_back(a, x)', 'push_back(a,x) → a′\n|a′| = |a| + 1\nx ∈ a′', 'Add one element and retain the inserted value.'],
  ['@truthy', 'truthy(a)', '∃σ₀ ∈ Init: σ₀ ⊨ EF(r₀)\n∃σ₁ ∈ Init: σ₁ ⊨ EF(r₁)', 'Return int 0 or 1; both return values must be reachable.'],
  ['@concat', 'concat(b, c)', 'a = concat(b,c) ⇒\nlength(a) ≥ length(b) ∧ length(a) ≥ length(c)', 'Return a string.'],
  ['@cast(T)', 'T(value)', 'type(result) ≡ T', 'Return the declared target type.'],
]

export function LanguageGuide() {
  useLocale()
  return <div className="language-guide stack">
    <Panel className="panel-pad">
      <h2>{t('Your first solution')}</h2>
      <p>{t('Start with one @solution function. The task supplies its arguments and checks its return value. Types are int, string, list and dict.')}</p>
      <GuideCode source={guideExamples[0]} />
      <p>{t('Use = for equality and and/or/not for logic. Integers wrap between −1000000 and 1000000; division by zero returns 42.')}</p>
      <p>{t('Run checks examples without publishing. Submit checks all tests and publishes accepted definitions. Use words from the task dictionary, joined with underscores; the task shows your name budget.')}</p>
    </Panel>
    <Panel className="panel-pad">
      <h2>{t('Shared names')}</h2>
      <p>{t('Variables and helper functions are global. Other players can replace them. Names declared with let inside a function also belong to the shared world.')}</p>
      <GuideCode source={guideExamples[3]} />
      <p>{t('Another player can publish shared = 99 through a passing solution to another task:')}</p>
      <GuideCode source={guideExamples[4]} />
      <p>{t('Earlier solutions are rechecked against the changed world. Their writes to replaced names are ignored during rechecks, so the first answer can become 99 and fail. Shared stdlib overrides can change familiar operations too.')}</p>
    </Panel>
    <Panel className="panel-pad">
      <h2>{t('Loops and collections')}</h2>
      <p>{t('Use let for declarations, assignment to update a name, if/else for branches and while for loops. Lists use [1, 2]; dictionaries use {"cat": 3}. There is no separate boolean type: logic produces int 0 or 1.')}</p>
      <GuideCode source={guideExamples[1]} />
      <p>{t('Lists and dictionaries are passed by reference during a run: assigning one to another name shares the object, so mutations through either name are visible through both. Published state stores values.')}</p>
    </Panel>
    <Panel className="panel-pad">
      <h2>{t('Functions and values')}</h2>
      <p>{t('Call a function with name(arguments). Missing arguments become int 0 and extra arguments are evaluated, then ignored. Finishing without return produces int 0. Parameters shadow shared names during a call; argument bindings do not publish. Explicit let declarations and assignments publish even when they use a parameter name.')}</p>
      <GuideCode source={guideExamples[2]} />
      <p>{t('A function name without () reads its last returned value, initially 0; it does not call the function or create a function reference. Each call updates that saved result.')}</p>
      <GuideCode source={guideExamples[6]} />
      <p>{t('Calling an ordinary variable returns its value: value() above is 7. keep receives 7 and a missing second argument of 0, so answer returns 7. Unknown names read as 0.')}</p>
    </Panel>
    <Panel className="panel-pad">
      <h2>{t('Standard library')}</h2>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>{t('Call')}</th><th>{t('Default behavior')}</th></tr></thead><tbody>{stdlib.map(([call, description]) => <tr key={call}><td><code>{call}</code></td><td>{t(description)}</td></tr>)}</tbody></table></div>
    </Panel>
    <Panel className="panel-pad">
      <h2><code>comefrom</code></h2>
      <p>{t('comefrom is a reverse jump. When execution reaches its target label or source line, it continues just after the matching comefrom instead. The declaration does not need to have executed first. This example returns 42:')}</p>
      <GuideCode source={guideExamples[7]} />
      <p>{t('Use comefrom target; for a label or comefrom 42; for an executable source line. Jumps can cross ordinary functions, replacing the current function; skipped declarations leave unknown names at 0. If multiple comefrom statements target the same point, the nearest in source wins. Jumps into or out of stdlib override functions are forbidden.')}</p>
    </Panel>
    <Panel className="panel-pad">
      <h2>{t('Type specifiers and implicit casts')}</h2>
      <p>{t('Usually omit type specifiers: fn keep(value) accepts any type. Writing fn <int> keep(value) converts its parameter to int before entering the body. Specifiers describe parameters, not the return type; @cast(T) is the exception that declares a result type. float and function specifiers are unavailable.')}</p>
      <GuideCode source={guideExamples[8]} />
      <p>{t('This returns 3, the length of "cat". Arithmetic converts operands to int; built-in mixed-type comparisons convert the right operand to the left operand’s type. concat converts both operands to string. Explicit int(...), string(...), list(...) and dict(...) use the same rules.')}</p>
      <div className="table-wrap"><table className="data-table"><thead><tr>{['From', 'To string', 'To list', 'To dict', 'To int'].map((label) => <th key={label}>{t(label)}</th>)}</tr></thead><tbody>{casts.map(([from, ...values]) => <tr key={from}><td><code>{from}</code></td>{values.map((value, index) => <td key={index}>{t(value)}</td>)}</tr>)}</tbody></table></div>
      <p>{t('Dictionary-to-list conversion places all keys before all values. Conversions to the same type keep the value. Function values use their saved result; operator dispatch treats a bare function name as int.')}</p>
      <p>{t('For stdlib overrides, candidates with matching argument count come first, then all other counts. Typed candidates precede untyped ones within each group. Selection uses the first argument: exact type first, then distance along int → string → list → dict; ties use the first candidate. With no arguments, the first typed candidate wins. After selection, parameters are converted to their declared types.')}</p>
    </Panel>
    <Panel className="panel-pad">
      <h2>{t('Redefining operations and casts')}</h2>
      <p>{t('Administrators can change which operations may be overridden. contains overrides are disabled by default.')}</p>
      <p>{t('Use an annotation on your own function name to override an operation; reserved stdlib names cannot be declared. Only overrides allowed by the administrator and task budget may be published. Type specifiers are useful here to select operand types and satisfy builtin input requirements.')}</p>
      <GuideCode source={guideExamples[5]} />
      <p>{t('Builtin escape calls are available only inside stdlib overrides. These bodies may call only __builtin_* functions and must not perform casts. __builtin_eq__ requires equal argument types. Replacing an existing override must preserve its annotation and contract; changed global parameters must also preserve its contracts.')}</p>
      <GuideCode source={guideExamples[9]} />
      <p>{t('@cast(list) chooses the target type; <int> chooses the source type. This override makes list(7) return [42] and also affects implicit int-to-list conversions throughout the shared world. Its result must have the declared target type.')}</p>
    </Panel>
    <Panel className="panel-pad">
      <h2>{t('Operator contracts')}</h2>
      <p>{t('In mutation formulas, a′ is the container after the operation; → describes the state change, not the function’s return value.')}</p>
      <p>{t('The following formulas describe required behavior, not executable LWLang. ≡ means equality in the description, ⇒ implication, ∧ and, ¬ not, and |a| the actual number of elements. set(a) denotes a mathematical set of values, not the LWLang mutation call. Equality and order laws apply to values of the same type.')}</p>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>{t('Annotation')}</th><th>{t('Operation')}</th><th>{t('Contract')}</th><th>{t('Result and meaning')}</th></tr></thead><tbody>{contracts.map(([annotation, operation, formula, description]) => <tr key={annotation}><td><code>{annotation}</code></td><td><code>{operation}</code></td><td><pre className="guide-formula mono">{formula}</pre></td><td>{t(description)}</td></tr>)}</tbody></table></div>
      <p>{t('For truthy, Init denotes initial states, EF means a return state is reachable, and r₀/r₁ denote returns of 0/1. Dictionary keys equivalent under eq replace an existing entry; equality does not depend on insertion order.')}</p>
    </Panel>
    <Link to="/world">{t('Explore shared names and available words →')}</Link>
    <Link to="/tasks">{t('Tasks')} →</Link>
  </div>
}
