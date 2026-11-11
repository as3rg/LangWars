import { create } from 'zustand'
import { api } from '@/api/client'
import type { NotificationPage, UserNotification } from '@/api/types'
import { useAuthStore } from './auth'

const SCANLINES_KEY = 'langwars.scanlines'

function readScanlines(): boolean {
  try {
    return localStorage.getItem(SCANLINES_KEY) !== 'off'
  } catch {
    return true
  }
}

interface UiState {
  scanlines: boolean
  toggleScanlines: () => void
}

export const useUiStore = create<UiState>((set) => ({
  scanlines: readScanlines(),
  toggleScanlines: () =>
    set((state) => {
      const next = !state.scanlines
      try {
        localStorage.setItem(SCANLINES_KEY, next ? 'on' : 'off')
      } catch {
        /* ignore */
      }
      return { scanlines: next }
    }),
}))

export type ToastKind = 'info' | 'success' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  notification?: UserNotification
  effect?: 'fireworks' | 'destruction'
}

interface ToastState {
  toasts: Toast[]
  delivered: Set<string>
  push: (kind: ToastKind, message: string, notification?: UserNotification) => void
  dismiss: (id: number) => void
  syncNotifications: (page: NotificationPage) => void
  clear: () => void
}

let toastSerial = 1

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  delivered: new Set(),
  push: (kind, message, notification) => {
    const id = toastSerial++
    const effect = notification?.kind === 'accepted' || notification?.kind === 'repaired' ? 'fireworks' : notification?.kind === 'broken' ? 'destruction' : undefined
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, kind, message, notification, effect }] }))
    window.setTimeout(() => get().dismiss(id), 4800)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  syncNotifications: (page) => {
    const latest = new Map(page.items.map((item) => [item.id, item]))
    set((state) => ({ toasts: state.toasts.flatMap((toast) => {
      if (!toast.notification) return [toast]
      if (!page.enabled || (page.breakImpactVisibility === 'hidden' && toast.notification.kind === 'breaking')) return []
      const item = { ...(latest.get(toast.notification.id) ?? toast.notification) }
      if (!page.showBreakerIdentity) delete item.breaker
      if (item.impact && page.breakImpactVisibility !== 'usernames') item.impact = { userCount: item.impact.userCount }
      return [{ ...toast, notification: item }]
    }) }))
  },
  clear: () => set({ toasts: [], delivered: new Set() }),
}))

export function toast(kind: ToastKind, message: string): void {
  useToastStore.getState().push(kind, message)
  const { token, user } = useAuthStore.getState()
  // Only generic application notices use this endpoint. Structured game events
  // originate on the server so later disclosure changes can redact old history.
  if (token && user) void api.createNotification(kind, message.slice(0, 2000)).catch(() => { /* the original popup remains visible when offline */ })
}

export function notificationToast(item: UserNotification): void {
  const state = useToastStore.getState()
  if (state.delivered.has(item.id)) return
  const delivered = new Set([...state.delivered, item.id].slice(-1000))
  useToastStore.setState({ delivered })
  const kind = item.kind === 'broken' || item.kind === 'rejected' ? 'error' : item.kind === 'accepted' || item.kind === 'repaired' ? 'success' : 'info'
  useToastStore.getState().push(kind, '', item)
}

useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id || state.token !== previous.token) useToastStore.getState().clear()
})
