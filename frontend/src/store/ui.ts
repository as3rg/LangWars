import { create } from 'zustand'

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
}

interface ToastState {
  toasts: Toast[]
  push: (kind: ToastKind, message: string) => void
  dismiss: (id: number) => void
}

let toastSerial = 1

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, message) => {
    const id = toastSerial++
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, kind, message }] }))
    window.setTimeout(() => get().dismiss(id), 4800)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

export function toast(kind: ToastKind, message: string): void {
  useToastStore.getState().push(kind, message)
}
