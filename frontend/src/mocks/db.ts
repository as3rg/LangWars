import { createTwoFilesPatch, diffLines } from 'diff'
import type {
  DiffHunk,
  RatingTable,
  RatingTableDescriptor,
  Submission,
  SubmissionSummary,
  Task,
  User,
} from '@/api/types'
import {
  seedEvents,
  seedNews,
  seedSubmissions,
  seedTasks,
  seedUsers,
  type DB,
  type MockSubmission,
  type MockTask,
} from './seed'

const DB_KEY = 'langwars.mock.db.v1'
const DB_VERSION = 1

let db: DB | null = null

function buildSeedDb(): DB {
  const { users, passwords } = seedUsers()
  return {
    version: DB_VERSION,
    users,
    passwords,
    tasks: seedTasks(),
    submissions: seedSubmissions(),
    news: seedNews(),
    events: seedEvents(),
  }
}

function load(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      if (parsed.version === DB_VERSION) return parsed
    }
  } catch {
    /* ignore corrupted storage */
  }
  const seeded = buildSeedDb()
  save(seeded)
  return seeded
}

function save(next: DB): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota errors */
  }
}

export function getDb(): DB {
  if (!db) db = load()
  return db
}

export function persist(): void {
  if (db) save(db)
}

export function resetDb(): void {
  db = buildSeedDb()
  persist()
}

export function issueToken(user: User): string {
  return `mock-token-${user.id}`
}

export function userFromRequest(request: Request): User | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  if (!token.startsWith('mock-token-')) return null
  const userId = token.slice('mock-token-'.length)
  return getDb().users.find((user) => user.id === userId) ?? null
}

export function publicTask(task: MockTask): Task {
  const { judge: _judge, ...rest } = task
  return rest
}

export function findTask(idOrSlug: string): MockTask | undefined {
  return getDb().tasks.find((task) => task.id === idOrSlug || task.slug === idOrSlug)
}

export function listTasks(user: User | null): Array<Record<string, unknown>> {
  const tasks = getDb().tasks
  return tasks.map((task) => {
    const submissions = getDb().submissions.filter((submission) => submission.taskId === task.id)
    const mine = user ? submissions.filter((submission) => submission.userId === user.id) : []
    return {
      ...publicTask(task),
      solvedBy: new Set(
        submissions.filter((submission) => submission.status === 'OK').map((submission) => submission.userId),
      ).size,
      solved: mine.some((submission) => submission.status === 'OK'),
      attempted: mine.length > 0,
    }
  })
}

export function toSummary(submission: MockSubmission): SubmissionSummary {
  const database = getDb()
  const task = database.tasks.find((candidate) => candidate.id === submission.taskId)
  const user = database.users.find((candidate) => candidate.id === submission.userId)
  return {
    id: submission.id,
    taskId: submission.taskId,
    taskTitle: task?.title ?? 'Unknown task',
    userId: submission.userId,
    username: user?.username ?? 'unknown',
    status: submission.status,
    score: submission.score,
    languageVersion: submission.languageVersion,
    createdAt: submission.createdAt,
    durationMs: submission.durationMs,
    testsPassed: submission.testsPassed,
    testsTotal: submission.testsTotal,
  }
}

function buildDiff(previous: string, next: string): NonNullable<Submission['diff']> {
  const hunks: DiffHunk[] = []
  let oldLine = 1
  let newLine = 1
  for (const part of diffLines(previous, next)) {
    const lines = part.value.split('\n')
    if (lines[lines.length - 1] === '') lines.pop()
    for (const line of lines) {
      if (part.added) {
        hunks.push({ type: 'add', newLine, text: line })
        newLine += 1
      } else if (part.removed) {
        hunks.push({ type: 'del', oldLine, text: line })
        oldLine += 1
      } else {
        hunks.push({ type: 'ctx', oldLine, newLine, text: line })
        oldLine += 1
        newLine += 1
      }
    }
  }
  const unified = createTwoFilesPatch('previous.lw', 'current.lw', previous, next, '', '', {
    context: 3,
  })
  return { unified, hunks }
}

export function toDetail(submission: MockSubmission): Submission {
  const summary = toSummary(submission)
  const database = getDb()
  const previous = database.submissions
    .filter(
      (candidate) =>
        candidate.userId === submission.userId &&
        candidate.taskId === submission.taskId &&
        candidate.createdAt < submission.createdAt,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  return {
    ...summary,
    code: submission.code,
    diagnostics: submission.diagnostics,
    tests: submission.tests,
    stdout: submission.stdout,
    previousId: previous?.id,
    previousCode: previous?.code,
    diff: previous ? { previousId: previous.id, ...buildDiff(previous.code, submission.code) } : undefined,
  }
}

function lastSolveFor(userId: string): string | undefined {
  return getDb()
    .submissions.filter((submission) => submission.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.createdAt
}

function globalDescriptor(): RatingTableDescriptor {
  return {
    id: 'global',
    title: 'Global ladder',
    description: 'Rating across every task. Accepted solutions feed the ladder.',
    columns: [
      { key: 'streak', label: 'Streak', align: 'center' },
      { key: 'lastSolve', label: 'Last solve', align: 'right' },
    ],
  }
}

function taskDescriptor(task: MockTask): RatingTableDescriptor {
  return {
    id: `task:${task.id}`,
    title: `${task.title} — task ladder`,
    description: task.tags.join(' · '),
    columns: [
      { key: 'bestTime', label: 'Best time', align: 'right' },
      { key: 'attempts', label: 'Attempts', align: 'center' },
    ],
  }
}

function eventDescriptor(eventId: string): RatingTableDescriptor | null {
  const event = getDb().events.find((candidate) => candidate.id === eventId)
  if (!event) return null
  return {
    id: event.id,
    title: `${event.title} — event`,
    description: event.description,
    columns: [
      { key: 'eventPoints', label: 'Event pts', align: 'right' },
      { key: 'badges', label: 'Badges', align: 'left' },
    ],
  }
}

export function ratingTableDescriptors(): RatingTableDescriptor[] {
  const database = getDb()
  return [
    globalDescriptor(),
    ...database.tasks.map((task) => taskDescriptor(task)),
    ...database.events
      .map((event) => eventDescriptor(event.id))
      .filter((descriptor): descriptor is RatingTableDescriptor => descriptor !== null),
  ]
}

function withMe(table: RatingTable, viewer: User | null): RatingTable {
  const descriptor = { ...table.descriptor }
  if (viewer) descriptor.highlightUserId = viewer.id
  return {
    ...table,
    descriptor,
    me: viewer ? table.rows.find((row) => row.userId === viewer.id) : undefined,
  }
}

function globalTable(viewer: User | null): RatingTable {
  const database = getDb()
  const rows = [...database.users]
    .sort((a, b) => b.rating - a.rating || a.username.localeCompare(b.username))
    .map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      username: user.username,
      score: user.rating,
      solved: user.solvedCount,
      extra: {
        streak: user.streak,
        lastSolve: lastSolveFor(user.id) ?? '—',
      },
    }))
  return withMe({ descriptor: globalDescriptor(), rows }, viewer)
}

function taskTable(taskId: string, viewer: User | null): RatingTable | null {
  const database = getDb()
  const task = database.tasks.find((candidate) => candidate.id === taskId)
  if (!task) return null

  const aggregates = new Map<
    string,
    { attempts: number; score: number; bestTime: number | null }
  >()
  for (const submission of database.submissions.filter((candidate) => candidate.taskId === task.id)) {
    const current = aggregates.get(submission.userId) ?? { attempts: 0, score: 0, bestTime: null }
    current.attempts += 1
    if (submission.status === 'OK') {
      current.score = Math.max(current.score, submission.score)
      current.bestTime =
        current.bestTime === null ? submission.durationMs : Math.min(current.bestTime, submission.durationMs)
    }
    aggregates.set(submission.userId, current)
  }

  const rows = [...aggregates.entries()]
    .map(([userId, stats]) => {
      const user = database.users.find((candidate) => candidate.id === userId)
      return {
        userId,
        username: user?.username ?? 'unknown',
        score: stats.score,
        solved: stats.score > 0 ? 1 : 0,
        bestTime: stats.bestTime,
        attempts: stats.attempts,
      }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const timeA = a.bestTime ?? Number.MAX_SAFE_INTEGER
      const timeB = b.bestTime ?? Number.MAX_SAFE_INTEGER
      if (timeA !== timeB) return timeA - timeB
      return a.username.localeCompare(b.username)
    })
    .map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      username: row.username,
      score: row.score,
      solved: row.solved,
      extra: {
        bestTime: row.bestTime === null ? '—' : `${row.bestTime} ms`,
        attempts: row.attempts,
      },
    }))

  return withMe({ descriptor: taskDescriptor(task), rows }, viewer)
}

function eventTable(eventId: string, viewer: User | null): RatingTable | null {
  const database = getDb()
  const event = database.events.find((candidate) => candidate.id === eventId)
  if (!event) return null
  const descriptor = eventDescriptor(eventId)
  if (!descriptor) return null

  const attempts = new Map<string, number>()
  const bestScores = new Map<string, Map<string, number>>()
  for (const submission of database.submissions.filter((candidate) => event.taskIds.includes(candidate.taskId))) {
    attempts.set(submission.userId, (attempts.get(submission.userId) ?? 0) + 1)
    if (submission.status === 'OK') {
      const perTask = bestScores.get(submission.userId) ?? new Map<string, number>()
      perTask.set(submission.taskId, Math.max(perTask.get(submission.taskId) ?? 0, submission.score))
      bestScores.set(submission.userId, perTask)
    }
  }

  const rows = [...attempts.entries()]
    .map(([userId, attemptCount]) => {
      const user = database.users.find((candidate) => candidate.id === userId)
      const points = [...(bestScores.get(userId)?.values() ?? [])].reduce((sum, value) => sum + value, 0)
      const badges: string[] = []
      if (points > 0) badges.push('catnip')
      if (points >= 250) badges.push('nine-lives')
      if (attemptCount >= 3 && points === 0) badges.push('stubborn')
      return {
        userId,
        username: user?.username ?? 'unknown',
        score: points,
        solved: points > 0 ? 1 : 0,
        extra: {
          eventPoints: points,
          badges: badges.length > 0 ? badges.join(', ') : '—',
        },
      }
    })
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
    .map((row, index) => ({ ...row, rank: index + 1 }))

  return withMe({ descriptor, rows }, viewer)
}

export function getRatingTable(id: string, viewer: User | null): RatingTable | null {
  if (id === 'global') return globalTable(viewer)
  if (id.startsWith('task:')) return taskTable(id.slice('task:'.length), viewer)
  if (id.startsWith('event:')) return eventTable(id, viewer)
  return null
}

export function applySubmissionRating(
  user: User,
  task: MockTask,
  status: MockSubmission['status'],
): { delta: number; newScore: number; rank: number; rankBefore: number } {
  const database = getDb()
  const sortedBefore = [...database.users].sort((a, b) => b.rating - a.rating)
  const rankBefore = sortedBefore.findIndex((candidate) => candidate.id === user.id) + 1
  const hadSolved = database.submissions.some(
    (submission) =>
      submission.userId === user.id && submission.taskId === task.id && submission.status === 'OK',
  )
  const before = user.rating

  if (status === 'OK') {
    if (!hadSolved) {
      user.rating += task.score
      user.solvedCount += 1
      user.streak += 1
    }
  } else {
    user.rating = Math.max(0, user.rating - 2)
    user.streak = 0
  }

  const sortedAfter = [...database.users].sort((a, b) => b.rating - a.rating)
  const rank = sortedAfter.findIndex((candidate) => candidate.id === user.id) + 1
  persist()
  return { delta: user.rating - before, newScore: user.rating, rank, rankBefore }
}

export function nextSubmissionId(): string {
  const database = getDb()
  const serial = database.submissions.length + 1
  return `sub_${String(serial).padStart(4, '0')}-${Date.now().toString(36)}`
}

export function listSubmissions(filter: {
  taskId?: string
  userId?: string
  limit?: number
}): SubmissionSummary[] {
  const database = getDb()
  return database.submissions
    .filter((submission) => (filter.taskId ? submission.taskId === filter.taskId : true))
    .filter((submission) => (filter.userId ? submission.userId === filter.userId : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, filter.limit ?? 50)
    .map(toSummary)
}
