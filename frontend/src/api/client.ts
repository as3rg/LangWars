import type {
  AdminSummary,
  AdminTask,
  AuditEntry,
  AuthResponse,
  Insights,
  NewsItem,
  RatingTable,
  RatingTableDescriptor,
  RunResult,
  Submission,
  SubmissionSummary,
  SubmissionCursor,
  SubmitResult,
  Task,
  TaskSummary,
  User,
  PlatformSettings,
  Invite,
  Namespace,
} from './types'

const TOKEN_KEY = 'langwars.token'
const BASE = '/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  },
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = tokenStore.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const controller = new AbortController()
  const abort = () => controller.abort()
  init.signal?.addEventListener('abort', abort, { once: true })
  if (init.signal?.aborted) controller.abort()
  const timeout = globalThis.setTimeout(abort, 20_000)
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, { ...init, headers, signal: controller.signal })
  } catch (cause) {
    if (controller.signal.aborted) throw new ApiError(408, 'REQUEST_TIMEOUT', 'The server did not respond in time. Please try again.')
    throw cause
  } finally {
    globalThis.clearTimeout(timeout)
    init.signal?.removeEventListener('abort', abort)
  }
  if (response.status === 204) return undefined as T

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : undefined

  if (!response.ok) {
    const error = payload?.error
    throw new ApiError(
      response.status,
      error?.code ?? `HTTP_${response.status}`,
      error?.message ?? response.statusText,
    )
  }
  return payload as T
}

type JobResponse<T> = { status: 'queued' | 'running' | 'completed' | 'failed'; result?: T; error?: { code: string; message: string } }

async function executeJob<T>(path: string, body: unknown): Promise<T> {
  const token = tokenStore.get()
  const accepted = await apiFetch<{ jobId: string }>(path, jsonBody(body))
  const deadline = Date.now() + 15 * 60_000
  for (;;) {
    await new Promise((resolve) => globalThis.setTimeout(resolve, 900))
    if (!token || tokenStore.get() !== token) throw new ApiError(401, 'SESSION_CHANGED', 'Your session changed. Sign in to check your submissions.')
    const job = await apiFetch<JobResponse<T>>(`/jobs/${encodeURIComponent(accepted.jobId)}`)
    if (job.status === 'completed' && job.result !== undefined) return job.result
    if (job.status === 'failed') throw new ApiError(422, job.error?.code ?? 'JOB_FAILED', job.error?.message ?? 'Execution failed')
    if (Date.now() > deadline) throw new ApiError(408, 'JOB_TIMEOUT', 'The worker is taking longer than expected. Check submissions before retrying.')
  }
}

function jsonBody(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) }
}

export const api = {
  login: (username: string, password: string) =>
    apiFetch<AuthResponse>('/auth/login', jsonBody({ username, password })),
  register: (username: string, password: string, inviteCode?: string) =>
    apiFetch<AuthResponse>('/auth/register', jsonBody({ username, password, inviteCode })),
  config: () => apiFetch<Pick<PlatformSettings, 'registrationMode' | 'runCooldownSeconds' | 'submitCooldownSeconds' | 'allowedWords' | 'maxNameLength'>>('/config'),
  logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
  me: () => apiFetch<User>('/me'),

  news: () => apiFetch<NewsItem[]>('/news'),
  newsItem: (id: string) => apiFetch<NewsItem>(`/news/${id}`),

  tasks: () => apiFetch<TaskSummary[]>('/tasks'),
  task: (id: string) => apiFetch<Task>(`/tasks/${id}`),
  run: (taskId: string, code: string, languageVersion: string) =>
    executeJob<RunResult>(`/tasks/${taskId}/run`, { code, languageVersion }),
  submit: (taskId: string, code: string, languageVersion: string) =>
    executeJob<SubmitResult>(`/tasks/${taskId}/submit`, { code, languageVersion }),
  taskSubmissions: (taskId: string, scope: 'mine' | 'all' = 'mine') =>
    apiFetch<SubmissionSummary[]>(`/tasks/${taskId}/submissions?scope=${scope}`),
  insights: (taskId: string) => apiFetch<Insights>(`/tasks/${taskId}/insights`),

  submissions: (params: { taskId?: string; userId?: string; limit?: number } = {}) => {
    const search = new URLSearchParams()
    if (params.taskId) search.set('taskId', params.taskId)
    if (params.userId) search.set('userId', params.userId)
    if (params.limit) search.set('limit', String(params.limit))
    const query = search.toString()
    return apiFetch<SubmissionSummary[]>(`/submissions${query ? `?${query}` : ''}`)
  },
  submission: (id: string) => apiFetch<Submission>(`/submissions/${id}`),

  ratingTables: () => apiFetch<RatingTableDescriptor[]>('/rating/tables'),
  rating: (table: string) => apiFetch<RatingTable>(`/rating?table=${encodeURIComponent(table)}`),

  adminSummary: () => apiFetch<AdminSummary>('/admin/summary'),
  adminUsers: () => apiFetch<User[]>('/admin/users'),
  updateUser: (id: string, patch: Partial<Pick<User, 'role' | 'adminNote' | 'banned' | 'nameLimit'>>) =>
    apiFetch<User>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  createNews: (item: Partial<NewsItem>) =>
    apiFetch<NewsItem>('/admin/news', jsonBody(item)),
  updateNews: (id: string, patch: Partial<NewsItem>) =>
    apiFetch<NewsItem>(`/admin/news/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteNews: (id: string) => apiFetch<void>(`/admin/news/${id}`, { method: 'DELETE' }),
  deleteUser: (id: string) => apiFetch<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id: string, password: string) => apiFetch<void>(`/admin/users/${id}/password`, jsonBody({ password })),
  adminSettings: () => apiFetch<PlatformSettings>('/admin/settings'),
  saveSettings: (settings: PlatformSettings) => apiFetch<PlatformSettings>('/admin/settings', { method: 'PATCH', body: JSON.stringify(settings) }),
  invites: () => apiFetch<Invite[]>('/admin/invites'),
  createInvite: (options: { maxUses: number; expiresInHours: number } = { maxUses: 1, expiresInHours: 24 }) => apiFetch<Invite>('/admin/invites', jsonBody(options)),
  deleteInvite: (id: string) => apiFetch<void>(`/admin/invites/${id}`, { method: 'DELETE' }),
  restoreOverrides: (operations?: string[]) => executeJob<{ restored: string[]; version: number }>('/admin/overrides/restore', { operations }),
  adminTasks: () => apiFetch<AdminTask[]>('/admin/tasks'),
  createTask: (task: Partial<AdminTask>) => apiFetch<AdminTask>('/admin/tasks', jsonBody(task)),
  updateTask: (id: string, task: Partial<AdminTask>) => apiFetch<AdminTask>(`/admin/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(task) }),
  deleteTask: (id: string) => apiFetch<void>(`/admin/tasks/${id}`, { method: 'DELETE' }),
  namespace: () => apiFetch<Namespace>('/namespace'),
  adminSubmissions: (cursor?: SubmissionCursor) => {
    const search = new URLSearchParams({ limit: '100' })
    if (cursor) {
      search.set('beforeCreated', cursor.beforeCreated)
      search.set('beforeId', cursor.beforeId)
    }
    return apiFetch<SubmissionSummary[]>(`/admin/submissions?${search}`)
  },
  audit: () => apiFetch<AuditEntry[]>('/admin/audit'),
}
