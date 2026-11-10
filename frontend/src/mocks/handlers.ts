import { delay, http, HttpResponse, type JsonBodyType } from 'msw'
import type {
  AdminSummary,
  AuthResponse,
  NewsItem,
  User,
} from '@/api/types'
import { isLangVersion } from '@/lwlang'
import {
  applySubmissionRating,
  findTask,
  getDb,
  getRatingTable,
  issueToken,
  listSubmissions,
  listTasks,
  nextSubmissionId,
  persist,
  publicTask,
  ratingTableDescriptors,
  resetDb,
  toDetail,
  toSummary,
  userFromRequest,
} from './db'
import { dryRun, judge } from './judge'
import type { MockSubmission, MockTask } from './seed'

const MOCK_HEADERS = { 'X-Mock-Backend': '1' }

function ok(data: unknown, status = 200) {
  return HttpResponse.json(data as JsonBodyType, { status, headers: MOCK_HEADERS })
}

function fail(status: number, code: string, message: string) {
  return HttpResponse.json(
    { error: { code, message } },
    { status, headers: MOCK_HEADERS },
  )
}

function noContent() {
  return new HttpResponse(null, { status: 204, headers: MOCK_HEADERS })
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    return {} as T
  }
}

function latency(): Promise<void> {
  return delay(120 + Math.round(Math.random() * 260))
}

function taskWithProgress(task: MockTask, user: User | null) {
  const database = getDb()
  const submissions = database.submissions.filter((submission) => submission.taskId === task.id)
  const mine = user ? submissions.filter((submission) => submission.userId === user.id) : []
  return {
    ...publicTask(task),
    solvedBy: new Set(
      submissions.filter((submission) => submission.status === 'OK').map((submission) => submission.userId),
    ).size,
    solved: mine.some((submission) => submission.status === 'OK'),
    attempted: mine.length > 0,
  }
}

function requireUser(request: Request): User | Response {
  const user = userFromRequest(request)
  if (!user) return fail(401, 'UNAUTHORIZED', 'Login required')
  return user
}

function requireAdmin(request: Request): User | Response {
  const user = userFromRequest(request)
  if (!user) return fail(401, 'UNAUTHORIZED', 'Login required')
  if (user.role !== 'admin') return fail(403, 'FORBIDDEN', 'Admin role required')
  return user
}

export const handlers = [
  http.get('/api/health', () => ok({ status: 'ok', mock: true })),

  http.post('/api/auth/login', async ({ request }) => {
    await latency()
    const body = await readJson<{ username?: string; password?: string }>(request)
    const database = getDb()
    const username = (body.username ?? '').trim().toLowerCase()
    const user = database.users.find((candidate) => candidate.username.toLowerCase() === username)
    if (!user || database.passwords[user.username] !== body.password) {
      return fail(401, 'BAD_CREDENTIALS', 'Wrong username or password. Try neko / nyanya.')
    }
    const response: AuthResponse = { token: issueToken(user), user }
    return ok(response)
  }),

  http.post('/api/auth/register', async ({ request }) => {
    await latency()
    const body = await readJson<{ username?: string; password?: string }>(request)
    const username = (body.username ?? '').trim()
    const password = body.password ?? ''
    if (username.length < 3 || username.length > 24) {
      return fail(400, 'BAD_USERNAME', 'Username must be 3-24 characters')
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return fail(400, 'BAD_USERNAME', 'Username may contain letters, digits and underscore')
    }
    if (password.length < 12) return fail(400, 'BAD_PASSWORD', 'Password must be at least 12 characters')

    const database = getDb()
    if (database.users.some((candidate) => candidate.username.toLowerCase() === username.toLowerCase())) {
      return fail(409, 'USERNAME_TAKEN', 'Username is already taken')
    }

    const user: User = {
      id: `usr_${Date.now().toString(36)}`,
      username,
      displayName: username,
      role: 'user',
      avatarHue: Math.round(Math.random() * 360),
      rating: 1200,
      solvedCount: 0,
      streak: 0,
      createdAt: new Date().toISOString(),
    }
    database.users.push(user)
    database.passwords[username] = password
    persist()
    const response: AuthResponse = { token: issueToken(user), user }
    return ok(response, 201)
  }),

  http.post('/api/auth/logout', ({ request }) => {
    const user = userFromRequest(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Login required')
    return noContent()
  }),

  http.get('/api/me', ({ request }) => {
    const user = userFromRequest(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Login required')
    return ok(user)
  }),

  http.patch('/api/me', async ({ request }) => {
    const user = userFromRequest(request)
    if (!user) return fail(401, 'UNAUTHORIZED', 'Login required')
    const body = await readJson<{ displayName?: string; avatarHue?: number }>(request)
    if (typeof body.displayName === 'string' && body.displayName.trim()) {
      user.displayName = body.displayName.trim()
    }
    if (typeof body.avatarHue === 'number') {
      user.avatarHue = Math.max(0, Math.min(360, Math.round(body.avatarHue)))
    }
    persist()
    return ok(user)
  }),

  http.get('/api/news', async () => {
    await latency()
    const news = [...getDb().news].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.createdAt.localeCompare(a.createdAt)
    })
    return ok(news)
  }),

  http.get('/api/news/:newsId', async ({ params }) => {
    await latency()
    const item = getDb().news.find((candidate) => candidate.id === params.newsId)
    if (!item) return fail(404, 'NOT_FOUND', 'News item not found')
    return ok(item)
  }),

  http.get('/api/tasks', async ({ request }) => {
    await latency()
    return ok(listTasks(userFromRequest(request)))
  }),

  http.get('/api/tasks/:taskId', async ({ request, params }) => {
    await latency()
    const task = findTask(String(params.taskId))
    if (!task) return fail(404, 'NOT_FOUND', 'Task not found')
    return ok(taskWithProgress(task, userFromRequest(request)))
  }),

  http.post('/api/tasks/:taskId/run', async ({ request, params }) => {
    const user = requireUser(request)
    if (user instanceof Response) return user
    const task = findTask(String(params.taskId))
    if (!task) return fail(404, 'NOT_FOUND', 'Task not found')
    const body = await readJson<{ code?: string; languageVersion?: string }>(request)
    if (typeof body.code !== 'string') return fail(400, 'BAD_BODY', 'code is required')
    if (body.code.length > 65536) return fail(422, 'CODE_TOO_LARGE', 'Code exceeds 64 KiB')
    await delay(320 + Math.round(Math.random() * 500))
    return ok(dryRun(task, body.code, body.languageVersion ?? task.languageVersion))
  }),

  http.post('/api/tasks/:taskId/submit', async ({ request, params }) => {
    const user = requireUser(request)
    if (user instanceof Response) return user
    const task = findTask(String(params.taskId))
    if (!task) return fail(404, 'NOT_FOUND', 'Task not found')

    const body = await readJson<{ code?: string; languageVersion?: string }>(request)
    if (typeof body.code !== 'string') return fail(400, 'BAD_BODY', 'code is required')
    if (body.code.length > 65536) return fail(422, 'CODE_TOO_LARGE', 'Code exceeds 64 KiB')

    const requestedVersion = body.languageVersion ?? task.languageVersion
    const version = isLangVersion(requestedVersion) ? requestedVersion : task.languageVersion
    await delay(420 + Math.round(Math.random() * 520))

    const result = judge(task, body.code, version)
    const rating = applySubmissionRating(user, task, result.status)

    const submission: MockSubmission = {
      id: nextSubmissionId(),
      taskId: task.id,
      userId: user.id,
      code: body.code,
      status: result.status,
      score: result.status === 'OK' ? task.score : 0,
      languageVersion: version,
      createdAt: new Date().toISOString(),
      durationMs: result.tests.reduce((sum, test) => sum + (test.durationMs ?? 0), 0),
      testsPassed: result.tests.filter((test) => test.passed).length,
      testsTotal: result.tests.length,
      diagnostics: result.diagnostics,
      tests: result.tests,
      stdout: result.stdout,
    }
    getDb().submissions.unshift(submission)
    persist()

    return ok(
      {
        submission: toDetail(submission),
        ratingUpdate: {
          tableId: 'global',
          delta: rating.delta,
          newScore: rating.newScore,
          rank: rating.rank,
          rankBefore: rating.rankBefore,
        },
      },
      201,
    )
  }),

  http.get('/api/tasks/:taskId/submissions', async ({ request, params }) => {
    const user = requireUser(request)
    if (user instanceof Response) return user
    const task = findTask(String(params.taskId))
    if (!task) return fail(404, 'NOT_FOUND', 'Task not found')
    const url = new URL(request.url)
    const scope = url.searchParams.get('scope') ?? 'mine'
    const summaries = listSubmissions({ taskId: task.id, userId: scope === 'all' ? undefined : user.id })
    return ok(summaries)
  }),

  http.get('/api/tasks/:taskId/insights', async ({ params }) => {
    await latency()
    const task = findTask(String(params.taskId))
    if (!task) return fail(404, 'NOT_FOUND', 'Task not found')
    const database = getDb()
    const submissions = database.submissions.filter((submission) => submission.taskId === task.id)
    const solvedUsers = new Set(
      submissions.filter((submission) => submission.status === 'OK').map((submission) => submission.userId),
    )
    const statusBreakdown = submissions.reduce<Record<string, number>>((acc, submission) => {
      acc[submission.status] = (acc[submission.status] ?? 0) + 1
      return acc
    }, {})
    const byUser = new Map<string, { attempts: number; solved: boolean }>()
    for (const submission of submissions) {
      const current = byUser.get(submission.userId) ?? { attempts: 0, solved: false }
      current.attempts += 1
      if (submission.status === 'OK') current.solved = true
      byUser.set(submission.userId, current)
    }
    const topCats = [...byUser.entries()]
      .map(([userId, stats]) => ({
        userId,
        username: database.users.find((candidate) => candidate.id === userId)?.username ?? 'unknown',
        ...stats,
      }))
      .sort((a, b) => Number(b.solved) - Number(a.solved) || b.attempts - a.attempts)
      .slice(0, 5)

    return ok({
      kind: task.customPages?.[0]?.kind ?? 'stats',
      data: {
        taskTitle: task.title,
        totalSubmissions: submissions.length,
        uniqueCats: byUser.size,
        solvedCats: solvedUsers.size,
        solveRate: submissions.length === 0 ? 0 : solvedUsers.size / byUser.size,
        averageAttempts:
          byUser.size === 0
            ? 0
            : Math.round(
                ([...byUser.values()].reduce((sum, stats) => sum + stats.attempts, 0) / byUser.size) * 10,
              ) / 10,
        fastestMs:
          submissions
            .filter((submission) => submission.status === 'OK')
            .reduce<number | null>(
              (best, submission) => (best === null ? submission.durationMs : Math.min(best, submission.durationMs)),
              null,
            ) ?? 0,
        statusBreakdown,
        topCats,
        recent: submissions
          .slice()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 5)
          .map(toSummary),
      },
    })
  }),

  http.get('/api/submissions', async ({ request }) => {
    const user = requireUser(request)
    if (user instanceof Response) return user
    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId') ?? undefined
    const userId = url.searchParams.get('userId') ?? undefined
    const limit = Number(url.searchParams.get('limit') ?? '50')
    return ok(listSubmissions({ taskId, userId, limit }))
  }),

  http.get('/api/submissions/:submissionId', async ({ request, params }) => {
    const user = requireUser(request)
    if (user instanceof Response) return user
    const submission = getDb().submissions.find((candidate) => candidate.id === params.submissionId)
    if (!submission) return fail(404, 'NOT_FOUND', 'Submission not found')
    if (submission.userId !== user.id && user.role !== 'admin') {
      return fail(403, 'FORBIDDEN', 'Code is private to its author')
    }
    return ok(toDetail(submission))
  }),

  http.get('/api/rating/tables', async () => {
    await latency()
    return ok(ratingTableDescriptors())
  }),

  http.get('/api/rating', async ({ request }) => {
    await latency()
    const url = new URL(request.url)
    const tableId = url.searchParams.get('table') ?? 'global'
    const table = getRatingTable(tableId, userFromRequest(request))
    if (!table) return fail(404, 'NOT_FOUND', 'Rating table not found')
    return ok(table)
  }),

  http.get('/api/admin/summary', async ({ request }) => {
    const admin = requireAdmin(request)
    if (admin instanceof Response) return admin
    await latency()
    const database = getDb()
    const summary: AdminSummary = {
      users: database.users.length,
      tasks: database.tasks.length,
      submissions: database.submissions.length,
      news: database.news.length,
      pendingReports: 2,
      recent: database.submissions
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
        .map(toSummary),
    }
    return ok(summary)
  }),

  http.get('/api/admin/users', async ({ request }) => {
    const admin = requireAdmin(request)
    if (admin instanceof Response) return admin
    return ok(getDb().users)
  }),

  http.patch('/api/admin/users/:userId', async ({ request, params }) => {
    const admin = requireAdmin(request)
    if (admin instanceof Response) return admin
    const user = getDb().users.find((candidate) => candidate.id === params.userId)
    if (!user) return fail(404, 'NOT_FOUND', 'User not found')
    const body = await readJson<{ role?: User['role']; adminNote?: string }>(request)
    if (body.role === 'user' || body.role === 'admin') user.role = body.role
    if (typeof body.adminNote === 'string') user.adminNote = body.adminNote
    persist()
    return ok(user)
  }),

  http.post('/api/admin/news', async ({ request }) => {
    const admin = requireAdmin(request)
    if (admin instanceof Response) return admin
    const body = await readJson<Partial<NewsItem>>(request)
    if (!body.title?.trim()) return fail(400, 'BAD_BODY', 'title is required')
    const item: NewsItem = {
      id: `news_${Date.now().toString(36)}`,
      title: body.title.trim(),
      body: body.body ?? '',
      category: body.category ?? 'update',
      pinned: Boolean(body.pinned),
      accent: body.accent ?? 'cyan',
      cta: body.cta,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      createdAt: new Date().toISOString(),
    }
    getDb().news.unshift(item)
    persist()
    return ok(item, 201)
  }),

  http.patch('/api/admin/news/:newsId', async ({ request, params }) => {
    const admin = requireAdmin(request)
    if (admin instanceof Response) return admin
    const item = getDb().news.find((candidate) => candidate.id === params.newsId)
    if (!item) return fail(404, 'NOT_FOUND', 'News item not found')
    const body = await readJson<Partial<NewsItem>>(request)
    const { id: _id, ...patch } = body
    Object.assign(item, patch)
    persist()
    return ok(item)
  }),

  http.delete('/api/admin/news/:newsId', async ({ request, params }) => {
    const admin = requireAdmin(request)
    if (admin instanceof Response) return admin
    const database = getDb()
    database.news = database.news.filter((item) => item.id !== params.newsId)
    persist()
    return noContent()
  }),

  http.post('/api/admin/tasks', async ({ request }) => {
    const admin = requireAdmin(request)
    if (admin instanceof Response) return admin
    const body = await readJson<Partial<MockTask>>(request)
    if (!body.title || !body.slug) return fail(400, 'BAD_BODY', 'title and slug are required')
    const task: MockTask = {
      id: `tsk_${Date.now().toString(36)}`,
      slug: body.slug,
      title: body.title,
      difficulty: body.difficulty ?? 'easy',
      tags: body.tags ?? [],
      score: body.score ?? 50,
      solvedBy: 0,
      languageVersion: body.languageVersion ?? 'v0.3',
      addonPacks: body.addonPacks ?? ['core'],
      statement: body.statement ?? '',
      constraints: body.constraints ?? [],
      examples: body.examples ?? [],
      starterCode: body.starterCode ?? '',
      entryPoint: body.entryPoint ?? 'main',
      timeLimitMs: body.timeLimitMs ?? 1000,
      customPages: body.customPages,
      ratingTable: body.ratingTable,
      judge: body.judge ?? { patterns: [], hint: '' },
    }
    getDb().tasks.push(task)
    persist()
    return ok(publicTask(task), 201)
  }),

  http.patch('/api/admin/tasks/:taskId', async ({ request, params }) => {
    const admin = requireAdmin(request)
    if (admin instanceof Response) return admin
    const task = getDb().tasks.find((candidate) => candidate.id === params.taskId)
    if (!task) return fail(404, 'NOT_FOUND', 'Task not found')
    const body = await readJson<Partial<MockTask>>(request)
    const { id: _id, solvedBy: _solvedBy, ...patch } = body
    Object.assign(task, patch)
    persist()
    return ok(publicTask(task))
  }),

  http.delete('/api/admin/tasks/:taskId', async ({ request, params }) => {
    const admin = requireAdmin(request)
    if (admin instanceof Response) return admin
    const database = getDb()
    database.tasks = database.tasks.filter((task) => task.id !== params.taskId)
    persist()
    return noContent()
  }),

  http.post('/api/admin/reset', async ({ request }) => {
    const admin = requireAdmin(request)
    if (admin instanceof Response) return admin
    resetDb()
    return noContent()
  }),
]
