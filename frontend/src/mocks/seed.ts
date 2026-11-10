import type {
  ApiDiagnostic,
  NewsItem,
  Task,
  TestResult,
  User,
  VerdictStatus,
} from '@/api/types'

export interface JudgeConfig {
  patterns: string[]
  hint: string
}

export interface MockTask extends Task {
  judge: JudgeConfig
}

export interface MockSubmission {
  id: string
  taskId: string
  userId: string
  code: string
  status: VerdictStatus
  score: number
  languageVersion: string
  createdAt: string
  durationMs: number
  testsPassed: number
  testsTotal: number
  diagnostics: ApiDiagnostic[]
  tests: TestResult[]
  stdout?: string
}

export interface EventDef {
  id: string
  title: string
  description: string
  taskIds: string[]
  accent: string
}

export interface DB {
  version: number
  users: User[]
  passwords: Record<string, string>
  tasks: MockTask[]
  submissions: MockSubmission[]
  news: NewsItem[]
  events: EventDef[]
}

const NOW = Date.now()
const HOUR = 3_600_000
const DAY = 24 * HOUR

function ago(ms: number): string {
  return new Date(NOW - ms).toISOString()
}

function ahead(ms: number): string {
  return new Date(NOW + ms).toISOString()
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const userSeeds: Array<[string, string, string, number, number, number, number, 'user' | 'admin']> = [
  ['usr_neko', 'neko', 'neko', 168, 1480, 4, 4, 'user'],
  ['usr_admin', 'admin', 'senpai', 288, 1720, 6, 9, 'admin'],
  ['usr_kuro', 'kuro', 'kuro_noir', 260, 1650, 5, 3, 'user'],
  ['usr_sakura', 'sakura', 'sakura.exe', 320, 1590, 4, 6, 'user'],
  ['usr_mochi', 'mochi', 'mochi', 35, 1510, 4, 2, 'user'],
  ['usr_tofu', 'tofu', 'tofu_uwu', 120, 1430, 3, 1, 'user'],
  ['usr_mikan', 'mikan', 'mikan', 25, 1380, 3, 5, 'user'],
  ['usr_pixel', 'pixelpaw', 'pixelpaw', 200, 1320, 2, 0, 'user'],
  ['usr_void', 'voidcat', 'voidcat', 275, 1290, 2, 1, 'user'],
  ['usr_nyaa', 'nyaa', 'nyaa~', 300, 1240, 1, 0, 'user'],
]

export function seedUsers(): { users: User[]; passwords: Record<string, string> } {
  const users: User[] = userSeeds.map(
    ([id, username, displayName, hue, rating, solvedCount, streak, role]) => ({
      id,
      username,
      displayName,
      email: `${username}@langwars.dev`,
      role,
      avatarHue: hue,
      rating,
      solvedCount,
      streak,
      createdAt: ago(40 * DAY + hue * HOUR),
    }),
  )
  const passwords: Record<string, string> = {}
  for (const user of users) passwords[user.username] = 'nyanya'
  return { users, passwords }
}

const baseConstraints = [
  'Code size limit: 64 KiB',
  'Only the declared language version keywords are available',
  'Standard LWLang builtins only',
]

function task(
  partial: Omit<MockTask, 'constraints' | 'solvedBy'> & { solvedBy?: number; constraints?: string[] },
): MockTask {
  return {
    constraints: baseConstraints,
    solvedBy: partial.solvedBy ?? 100,
    ...partial,
  }
}

export function seedTasks(): MockTask[] {
  return [
    task({
      id: 'tsk_sum',
      slug: 'sum-two',
      title: 'Byte Me',
      difficulty: 'easy',
      tags: ['basics', 'math'],
      score: 50,
      solvedBy: 1832,
      languageVersion: 'v0.1',
      addonPacks: ['core'],
      entryPoint: 'sum',
      timeLimitMs: 1000,
      statement: [
        '## Story',
        'A tiny robot cat crashes into your terminal and asks for the most basic of favours: add two numbers.',
        '',
        '## Task',
        'Implement `fn sum(a: int, b: int) -> int` that returns `a + b`.',
        '',
        '> Tip: the `core` addon already lints trailing whitespace, naming and arity.',
      ].join('\n'),
      constraints: [...baseConstraints, '-10^9 <= a, b <= 10^9'],
      examples: [
        { input: 'sum(2, 3)', output: '5' },
        { input: 'sum(-4, 10)', output: '6' },
        { input: 'sum(0, 0)', output: '0' },
      ],
      starterCode: ['fn sum(a: int, b: int) -> int {', '  // TODO: add the two numbers', '  return 0', '}'].join(
        '\n',
      ),
      judge: { patterns: ['a\\s*\\+\\s*b'], hint: 'Return the sum using the + operator.' },
    }),
    task({
      id: 'tsk_squares',
      slug: 'purrfect-squares',
      title: 'Purrfect Squares',
      difficulty: 'easy',
      tags: ['loops', 'math'],
      score: 80,
      solvedBy: 1204,
      languageVersion: 'v0.1',
      addonPacks: ['core'],
      entryPoint: 'sum_squares',
      timeLimitMs: 1000,
      statement: [
        '## Story',
        'The cat wants to tile its nap mat with perfect squares. It has exactly `n` tiles and wants to know the sum of the squares of the first `n` natural numbers.',
        '',
        '## Task',
        'Implement `fn sum_squares(n: int) -> int`.',
        '',
        'Use a loop. Yes, there is a closed form. No, the cat does not care.',
      ].join('\n'),
      constraints: [...baseConstraints, '0 <= n <= 10^5'],
      examples: [
        { input: 'sum_squares(3)', output: '14' },
        { input: 'sum_squares(1)', output: '1' },
        { input: 'sum_squares(0)', output: '0' },
      ],
      starterCode: [
        'fn sum_squares(n: int) -> int {',
        '  let total = 0',
        '  // TODO: loop from 1 to n and add i * i',
        '  return total',
        '}',
      ].join('\n'),
      judge: { patterns: ['while\\s*\\(|for\\s+\\w+\\s+in'], hint: 'Your function needs a loop.' },
    }),
    task({
      id: 'tsk_match',
      slug: 'matchmaker',
      title: 'Matchmaker',
      difficulty: 'medium',
      tags: ['pattern-matching', 'v0.2'],
      score: 120,
      solvedBy: 744,
      languageVersion: 'v0.2',
      addonPacks: ['core', 'match'],
      entryPoint: 'grade',
      timeLimitMs: 1200,
      statement: [
        '## Story',
        'The oracle cat speaks only in grades. Translate numbers into words with the brand-new `match` expression (LWLang v0.2).',
        '',
        '## Task',
        'Implement `fn grade(score: int) -> str` using `match` with `case` arms.',
        '- 90+ → `"S"`',
        '- 80..89 → `"A"`',
        '- 70..79 → `"B"`',
        '- everything else → `"F"`',
        '',
        'Add a `_` arm. The `match` addon warns if your match may not be exhaustive.',
      ].join('\n'),
      constraints: [...baseConstraints, 'LWLang v0.2 keywords: match, case, cat', '0 <= score <= 100'],
      examples: [
        { input: 'grade(95)', output: 'S' },
        { input: 'grade(85)', output: 'A' },
        { input: 'grade(12)', output: 'F' },
      ],
      starterCode: [
        'fn grade(score: int) -> str {',
        '  // TODO: replace this if-chain with a match',
        '  if score >= 90 {',
        '    return "S"',
        '  }',
        '  return "F"',
        '}',
      ].join('\n'),
      judge: { patterns: ['match\\s+'], hint: 'This task expects a match expression.' },
    }),
    task({
      id: 'tsk_fib',
      slug: 'nine-lives',
      title: 'Nine Lives',
      difficulty: 'medium',
      tags: ['recursion', 'v0.2'],
      score: 130,
      solvedBy: 512,
      languageVersion: 'v0.2',
      addonPacks: ['core', 'match'],
      entryPoint: 'fib',
      timeLimitMs: 2000,
      statement: [
        '## Story',
        'Every cat has nine lives. The ninth life is, of course, Fibonacci.',
        '',
        '## Task',
        'Implement `fn fib(n: int) -> int` recursively. `fib(0) = 0`, `fib(1) = 1`.',
        '',
        'The `core` addon warns about recursion with no visible base case.',
      ].join('\n'),
      constraints: [...baseConstraints, '0 <= n <= 20'],
      examples: [
        { input: 'fib(0)', output: '0' },
        { input: 'fib(6)', output: '8' },
        { input: 'fib(10)', output: '55' },
      ],
      starterCode: [
        'fn fib(n: int) -> int {',
        '  // TODO: base cases first, then recurse',
        '  return 0',
        '}',
      ].join('\n'),
      judge: {
        patterns: ['fib\\s*\\(\\s*n\\s*-\\s*1\\s*\\)', 'fib\\s*\\(\\s*n\\s*-\\s*2\\s*\\)'],
        hint: 'Call fib(n - 1) and fib(n - 2).',
      },
    }),
    task({
      id: 'tsk_speak',
      slug: 'speak-neko',
      title: 'Speak, Neko!',
      difficulty: 'easy',
      tags: ['strings', 'v0.3'],
      score: 90,
      solvedBy: 923,
      languageVersion: 'v0.3',
      addonPacks: ['core', 'match', 'speak'],
      entryPoint: 'greet',
      timeLimitMs: 1000,
      statement: [
        '## Story',
        'The cat has found its voice. LWLang v0.3 introduces the `speak` statement.',
        '',
        '## Task',
        'Implement `fn greet(name: str)` that `speak`s `"nya, " cat name` using the `cat` operator.',
        '',
        '```lw',
        'fn greet(name: str) {',
        '  speak "nya, " cat name',
        '}',
        '```',
      ].join('\n'),
      constraints: [...baseConstraints, 'LWLang v0.3 adds: speak, len, push'],
      examples: [
        { input: 'greet("senpai")', output: 'nya, senpai' },
        { input: 'greet("")', output: 'nya, ' },
      ],
      starterCode: ['fn greet(name: str) {', '  // TODO: speak a greeting', '}'].join('\n'),
      judge: { patterns: ['speak\\s+'], hint: 'Use the speak statement introduced in v0.3.' },
    }),
    task({
      id: 'tsk_array',
      slug: 'constellation',
      title: 'Constellation',
      difficulty: 'medium',
      tags: ['arrays', 'v0.3'],
      score: 140,
      solvedBy: 401,
      languageVersion: 'v0.3',
      addonPacks: ['core', 'match', 'speak'],
      entryPoint: 'star_total',
      timeLimitMs: 1500,
      statement: [
        '## Story',
        'Count the stars in a constellation. The array may be empty (sad cat).',
        '',
        '## Task',
        'Implement `fn star_total(stars: arr) -> int` that sums every element.',
        '',
        'Use `len(stars)` and a `for ... in` loop.',
      ].join('\n'),
      constraints: [...baseConstraints, '0 <= len(stars) <= 10^5'],
      examples: [
        { input: 'star_total([1, 2, 3])', output: '6' },
        { input: 'star_total([])', output: '0' },
      ],
      starterCode: [
        'fn star_total(stars: arr) -> int {',
        '  let total = 0',
        '  // TODO: iterate over stars',
        '  return total',
        '}',
      ].join('\n'),
      judge: {
        patterns: ['for\\s+\\w+\\s+in|while\\s*\\(', 'len\\s*\\('],
        hint: 'Use len(stars) and a loop.',
      },
    }),
    task({
      id: 'tsk_quantum',
      slug: 'quantum-paw',
      title: 'Quantum Paw',
      difficulty: 'hard',
      tags: ['arrays', 'pairs', 'v0.3'],
      score: 220,
      solvedBy: 96,
      languageVersion: 'v0.3',
      addonPacks: ['core', 'match', 'speak', 'perf'],
      entryPoint: 'count_pairs',
      timeLimitMs: 2500,
      statement: [
        '## Story',
        "Two paws touch at the same time in two different places. Schrodinger's cat is unimpressed.",
        '',
        '## Task',
        'Implement `fn count_pairs(values: arr, target: int) -> int` returning the number of index pairs `i < j` with `values[i] + values[j] == target`.',
        '',
        'A quadratic scan is acceptable for this arena. The `perf` addon watches your nesting.',
      ].join('\n'),
      constraints: [...baseConstraints, '0 <= len(values) <= 500'],
      examples: [
        { input: 'count_pairs([1, 2, 3, 4], 5)', output: '2' },
        { input: 'count_pairs([1, 1, 1], 2)', output: '3' },
      ],
      starterCode: [
        'fn count_pairs(values: arr, target: int) -> int {',
        '  let pairs = 0',
        '  // TODO: nested loops over indices',
        '  return pairs',
        '}',
      ].join('\n'),
      judge: { patterns: ['for\\s+\\w+\\s+in[\\s\\S]*for\\s+\\w+\\s+in'], hint: 'Use two nested for loops.' },
    }),
    task({
      id: 'tsk_catnip',
      slug: 'catnip-night',
      title: 'Catnip Night',
      difficulty: 'nightmare',
      tags: ['event', 'holiday', 'match', 'v0.3'],
      score: 300,
      solvedBy: 58,
      languageVersion: 'v0.3',
      addonPacks: ['core', 'match', 'speak', 'perf'],
      entryPoint: 'catnip',
      timeLimitMs: 3000,
      ratingTable: 'event:catnip-2026',
      customPages: [{ id: 'cat-stats', title: 'Cat Stats', kind: 'stats' }],
      statement: [
        '## Story',
        'Once a year the neon city dims its signs and the cats take over the terminals. Catnip Night is here.',
        '',
        '## Task',
        'Implement `fn catnip(n: int) -> str` for the holiday ritual:',
        '- multiples of 3 → `"cat"`',
        '- multiples of 5 → `"nip"`',
        '- multiples of 15 → `"catnip"`',
        '- otherwise the number as a string',
        '',
        'Then `speak` one result per call. Use `match` and `speak` together. This task ships the `perf` addon.',
        '',
        '> Event task: scoring feeds the **Catnip Night** rating table.',
      ].join('\n'),
      constraints: [...baseConstraints, '1 <= n <= 10^6', 'Event rules: one submission per minute'],
      examples: [
        { input: 'catnip(3)', output: 'cat' },
        { input: 'catnip(15)', output: 'catnip' },
        { input: 'catnip(7)', output: '7' },
      ],
      starterCode: [
        'fn catnip(n: int) -> str {',
        '  // TODO: match on n % 3 and n % 5',
        '  return "catnip"',
        '}',
      ].join('\n'),
      judge: {
        patterns: ['match\\s+', 'speak\\s+'],
        hint: 'Catnip Night needs both match and speak.',
      },
    }),
  ]
}

export function seedNews(): NewsItem[] {
  return [
    {
      id: 'news_catnip',
      title: 'Catnip Night 2026 is LIVE',
      body: [
        'The annual holiday event has begun. Solve **Catnip Night** and climb the event table.',
        '',
        '- New task: *Catnip Night* (nightmare)',
        '- Custom **Cat Stats** page per task',
        '- Event rating columns: `eventPoints`, `badges`',
      ].join('\n'),
      category: 'holiday',
      pinned: true,
      accent: 'amber',
      cta: { label: 'Enter the event', href: '/tasks/tsk_catnip' },
      startsAt: ago(3 * DAY),
      endsAt: ahead(7 * DAY),
      createdAt: ago(3 * DAY),
    },
    {
      id: 'news_v03',
      title: 'LWLang v0.3 — the cat speaks',
      body: [
        '`speak`, `len` and `push` landed. The `speak` addon now flags empty speak statements and suspicious `cat` operands.',
        '',
        'Open **Speak, Neko!** to try the new voice.',
      ].join('\n'),
      category: 'update',
      pinned: false,
      accent: 'cyan',
      cta: { label: 'Try speak', href: '/tasks/tsk_speak' },
      createdAt: ago(2 * DAY),
    },
    {
      id: 'news_double',
      title: 'Double rating weekend',
      body: 'Every first accepted solution this weekend awards its full score to the global ladder. The cat is watching the leaderboard.',
      category: 'event',
      pinned: false,
      accent: 'magenta',
      createdAt: ago(30 * HOUR),
    },
    {
      id: 'news_addons',
      title: 'Editor addon API (preview)',
      body: [
        'Task authors can now ship addons that run on the **AST** or on **raw source**.',
        '',
        'Diagnostics appear in the gutter and the problems panel. The `perf` addon is the first task-scoped pack.',
      ].join('\n'),
      category: 'update',
      pinned: false,
      accent: 'violet',
      createdAt: ago(18 * HOUR),
    },
    {
      id: 'news_maint',
      title: 'Judge maintenance window',
      body: 'The mock judge sleeps between 03:00 and 03:20 UTC. Real judge maintenance will be announced here.',
      category: 'maintenance',
      pinned: false,
      accent: 'cyan',
      createdAt: ago(9 * HOUR),
    },
  ]
}

export function seedEvents(): EventDef[] {
  return [
    {
      id: 'event:catnip-2026',
      title: 'Catnip Night',
      description: 'Holiday event ladder. Scores from event tasks only.',
      taskIds: ['tsk_catnip'],
      accent: 'amber',
    },
  ]
}

const nekoCodes: Record<string, { wrong: string; ok: string }> = {
  tsk_sum: {
    wrong: ['fn sum(a: int, b: int) -> int {', '  // TODO: add the two numbers', '  return 0', '}'].join('\n'),
    ok: ['fn sum(a: int, b: int) -> int {', '  return a + b', '}'].join('\n'),
  },
  tsk_squares: {
    wrong: ['fn sum_squares(n: int) -> int {', '  return 0', '}'].join('\n'),
    ok: [
      'fn sum_squares(n: int) -> int {',
      '  let total = 0',
      '  let i = 1',
      '  while i <= n {',
      '    total += i * i',
      '    i += 1',
      '  }',
      '  return total',
      '}',
    ].join('\n'),
  },
  tsk_match: {
    wrong: ['fn grade(score: int) -> str {', '  return "F"', '}'].join('\n'),
    ok: [
      'fn grade(score: int) -> str {',
      '  match score {',
      '    case 90 { return "S" }',
      '    case 80 { return "A" }',
      '    case 70 { return "B" }',
      '    _ -> { return "F" }',
      '  }',
      '}',
    ].join('\n'),
  },
  tsk_speak: {
    wrong: ['fn greet(name: str) {', '  speak', '}'].join('\n'),
    ok: ['fn greet(name: str) {', '  speak "nya, " cat name', '}'].join('\n'),
  },
}

export function seedSubmissions(): MockSubmission[] {
  const submissions: MockSubmission[] = []
  const tasks = seedTasks()
  const { users } = seedUsers()
  const others = users.filter((user) => user.id !== 'usr_neko')
  const rand = mulberry32(1337)
  let serial = 1

  const nekoPlan: Array<{ taskId: keyof typeof nekoCodes; status: VerdictStatus; code: string; hours: number }> = [
    { taskId: 'tsk_sum', status: 'WRONG_ANSWER', code: nekoCodes.tsk_sum.wrong, hours: 74 },
    { taskId: 'tsk_sum', status: 'OK', code: nekoCodes.tsk_sum.ok, hours: 73 },
    { taskId: 'tsk_squares', status: 'OK', code: nekoCodes.tsk_squares.ok, hours: 40 },
    { taskId: 'tsk_speak', status: 'OK', code: nekoCodes.tsk_speak.ok, hours: 5 },
    { taskId: 'tsk_match', status: 'WRONG_ANSWER', code: nekoCodes.tsk_match.wrong, hours: 2 },
    { taskId: 'tsk_match', status: 'OK', code: nekoCodes.tsk_match.ok, hours: 1 },
  ]

  for (const plan of nekoPlan) {
    const taskDef = tasks.find((candidate) => candidate.id === plan.taskId)!
    const total = taskDef.examples.length + 1
    const passed = plan.status === 'OK' ? total : plan.status === 'WRONG_ANSWER' ? 1 : 0
    submissions.push({
      id: `sub_seed_${String(serial++).padStart(3, '0')}`,
      taskId: taskDef.id,
      userId: 'usr_neko',
      code: plan.code,
      status: plan.status,
      score: plan.status === 'OK' ? taskDef.score : 0,
      languageVersion: taskDef.languageVersion,
      createdAt: ago(plan.hours * HOUR),
      durationMs: 400 + Math.round(rand() * 800),
      testsPassed: passed,
      testsTotal: total,
      diagnostics: [],
      tests: taskDef.examples.map((example, index) => ({
        name: `Example ${index + 1}`,
        input: example.input,
        expected: example.output,
        actual: plan.status === 'OK' ? example.output : '0',
        passed: plan.status === 'OK',
      })),
      stdout: plan.status === 'OK' ? '' : 'expected a different answer',
    })
  }

  tasks.forEach((taskDef, taskIndex) => {
    const count = 2 + (taskIndex % 3)
    for (let i = 0; i < count; i++) {
      const user = others[(taskIndex * 2 + i) % others.length]
      const roll = rand()
      const status: VerdictStatus = roll > 0.32 ? 'OK' : roll > 0.16 ? 'WRONG_ANSWER' : 'TLE'
      const total = taskDef.examples.length + 1
      submissions.push({
        id: `sub_seed_${String(serial++).padStart(3, '0')}`,
        taskId: taskDef.id,
        userId: user.id,
        code: taskDef.starterCode,
        status,
        score: status === 'OK' ? taskDef.score : 0,
        languageVersion: taskDef.languageVersion,
        createdAt: ago((taskIndex + 1) * 8 * HOUR + i * 2 * HOUR),
        durationMs: 300 + Math.round(rand() * 1400),
        testsPassed: status === 'OK' ? total : status === 'WRONG_ANSWER' ? 1 : 0,
        testsTotal: total,
        diagnostics: [],
        tests: [],
      })
    }
  })

  return submissions.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
