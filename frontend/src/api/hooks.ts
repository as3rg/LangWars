import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './client'
import type { NewsItem } from './types'
import { useAuthStore } from '@/store/auth'

export const qk = {
  me: ['me'] as const,
  news: ['news'] as const,
  tasks: ['tasks'] as const,
  task: (id: string) => ['task', id] as const,
  taskSubmissions: (id: string, scope: string) => ['taskSubmissions', id, scope] as const,
  submissions: (taskId?: string, userId?: string) => ['submissions', taskId ?? 'all', userId ?? 'all'] as const,
  submission: (id: string) => ['submission', id] as const,
  insights: (id: string) => ['insights', id] as const,
  ratingTables: ['ratingTables'] as const,
  rating: (table: string) => ['rating', table] as const,
  adminSummary: ['admin', 'summary'] as const,
  adminUsers: ['admin', 'users'] as const,
}

export function useSession() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const clear = useAuthStore((state) => state.clear)

  const query = useQuery({
    queryKey: ['me', token] as const,
    queryFn: api.me,
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
    refetchInterval: 15_000,
  })

  useEffect(() => {
    if (query.data) setUser(query.data)
  }, [query.data, setUser])

  useEffect(() => {
    if (query.error instanceof ApiError && [401, 403].includes(query.error.status) && token) clear()
  }, [query.error, token, clear])

  return {
    token,
    user,
    loading: Boolean(token) && query.isLoading,
    isAdmin: user?.role === 'admin',
  }
}

export function useNews() {
  return useQuery({ queryKey: qk.news, queryFn: api.news })
}

export function useTasks() {
  return useQuery({ queryKey: qk.tasks, queryFn: api.tasks, refetchInterval: 15_000 })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: qk.task(id ?? ''),
    queryFn: () => api.task(id!),
    enabled: Boolean(id),
  })
}

export function useTaskSubmissions(taskId: string | undefined, scope: 'mine' | 'all') {
  const token = useAuthStore((state) => state.token)
  return useQuery({
    queryKey: qk.taskSubmissions(taskId ?? '', scope),
    queryFn: () => api.taskSubmissions(taskId!, scope),
    enabled: Boolean(taskId) && Boolean(token),
    refetchInterval: 10_000,
  })
}

export function useAllSubmissions(params: { taskId?: string; userId?: string } = {}) {
  const token = useAuthStore((state) => state.token)
  return useQuery({
    queryKey: qk.submissions(params.taskId, params.userId),
    queryFn: () => api.submissions({ ...params, limit: 100 }),
    enabled: Boolean(token),
    refetchInterval: 10_000,
  })
}

export function useSubmissionDetail(id: string | null) {
  const token = useAuthStore((state) => state.token)
  return useQuery({
    queryKey: qk.submission(id ?? ''),
    queryFn: () => api.submission(id!),
    enabled: Boolean(id) && Boolean(token),
    retry: false,
  })
}

export function useInsights(taskId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.insights(taskId ?? ''),
    queryFn: () => api.insights(taskId!),
    enabled: Boolean(taskId) && enabled,
  })
}

export function useRatingTables() {
  return useQuery({ queryKey: qk.ratingTables, queryFn: api.ratingTables })
}

export function useRating(table: string) {
  return useQuery({
    queryKey: qk.rating(table),
    queryFn: () => api.rating(table),
    enabled: Boolean(table),
    refetchInterval: 15_000,
  })
}

export function useAdminSummary(enabled: boolean) {
  return useQuery({
    queryKey: qk.adminSummary,
    queryFn: api.adminSummary,
    enabled,
    retry: false,
  })
}

export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: qk.adminUsers,
    queryFn: api.adminUsers,
    enabled,
    retry: false,
  })
}

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      api.login(username, password),
    onSuccess: (data) => {
      setAuth(data.user, data.token)
      queryClient.setQueryData(['me', data.token], data.user)
      queryClient.invalidateQueries()
    },
  })
}

export function useRegister() {
  const setAuth = useAuthStore((state) => state.setAuth)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ username, email, password, inviteCode }: { username: string; email: string; password: string; inviteCode?: string }) =>
      api.register(username, email, password, inviteCode),
    onSuccess: (data) => {
      setAuth(data.user, data.token)
      queryClient.setQueryData(['me', data.token], data.user)
      queryClient.invalidateQueries()
    },
  })
}

export function useLogout() {
  const clear = useAuthStore((state) => state.clear)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        await api.logout()
      } catch {
        /* token may already be invalid */
      }
    },
    onSettled: () => {
      clear()
      queryClient.clear()
    },
  })
}

export function useRun(taskId: string) {
  return useMutation({
    mutationFn: ({ code, version }: { code: string; version: string }) =>
      api.run(taskId, code, version),
  })
}

export function useSubmit(taskId: string) {
  const queryClient = useQueryClient()
  const patchUser = useAuthStore((state) => state.patchUser)
  return useMutation({
    mutationFn: ({ code, version }: { code: string; version: string }) =>
      api.submit(taskId, code, version),
    onSuccess: (data) => {
      patchUser({ rating: data.ratingUpdate.newScore })
      queryClient.invalidateQueries({ queryKey: qk.tasks })
      queryClient.invalidateQueries({ queryKey: qk.task(taskId) })
      queryClient.invalidateQueries({ queryKey: ['taskSubmissions', taskId] })
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['rating'] })
      queryClient.invalidateQueries({ queryKey: qk.ratingTables })
      queryClient.invalidateQueries({ queryKey: qk.insights(taskId) })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useNewsMutations() {
  const queryClient = useQueryClient()
  const create = useMutation({
    mutationFn: (item: Partial<NewsItem>) => api.createNews(item),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.news }),
  })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NewsItem> }) => api.updateNews(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.news }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteNews(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.news }),
  })
  return { create, update, remove }
}
