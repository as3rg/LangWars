import type {
  AdminSummary,
  AuthResponse,
  Insights,
  NewsItem,
  RatingTable,
  RatingTableDescriptor,
  RunResult,
  Submission,
  SubmissionSummary,
  SubmitResult,
  Task,
  TaskSummary,
  User,
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

  const response = await fetch(`${BASE}${path}`, { ...init, headers })
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

function jsonBody(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) }
}

export const api = {
  login: (username: string, password: string) =>
    apiFetch<AuthResponse>('/auth/login', jsonBody({ username, password })),
  register: (username: string, email: string, password: string) =>
    apiFetch<AuthResponse>('/auth/register', jsonBody({ username, email, password })),
  logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
  me: () => apiFetch<User>('/me'),

  news: () => apiFetch<NewsItem[]>('/news'),
  newsItem: (id: string) => apiFetch<NewsItem>(`/news/${id}`),

  tasks: () => apiFetch<TaskSummary[]>('/tasks'),
  task: (id: string) => apiFetch<Task>(`/tasks/${id}`),
  run: (taskId: string, code: string, languageVersion: string) =>
    apiFetch<RunResult>(`/tasks/${taskId}/run`, jsonBody({ code, languageVersion })),
  submit: (taskId: string, code: string, languageVersion: string) =>
    apiFetch<SubmitResult>(`/tasks/${taskId}/submit`, jsonBody({ code, languageVersion })),
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
  updateUser: (id: string, patch: Partial<Pick<User, 'role' | 'adminNote'>>) =>
    apiFetch<User>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  createNews: (item: Partial<NewsItem>) =>
    apiFetch<NewsItem>('/admin/news', jsonBody(item)),
  updateNews: (id: string, patch: Partial<NewsItem>) =>
    apiFetch<NewsItem>(`/admin/news/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteNews: (id: string) => apiFetch<void>(`/admin/news/${id}`, { method: 'DELETE' }),
  resetMock: () => apiFetch<void>('/admin/reset', { method: 'POST' }),
}
