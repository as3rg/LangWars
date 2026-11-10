import { create } from 'zustand'
import { tokenStore } from '@/api/client'
import type { User } from '@/api/types'

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (user: User, token: string) => void
  setUser: (user: User) => void
  patchUser: (patch: Partial<User>) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: tokenStore.get(),
  user: null,
  setAuth: (user, token) => {
    tokenStore.set(token)
    set({ user, token })
  },
  setUser: (user) => set({ user }),
  patchUser: (patch) =>
    set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
  clear: () => {
    tokenStore.set(null)
    set({ token: null, user: null })
  },
}))
