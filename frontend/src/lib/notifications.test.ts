import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { api } from '@/api/client'
import type { NotificationPage, User, UserNotification } from '@/api/types'
import { useAuthStore } from '@/store/auth'
import { notificationToast, toast, useToastStore } from '@/store/ui'
import { BreakImpactBadge } from '@/components/BreakImpact'
import { StatusPill } from '@/components/ui'
import { NotificationTracker, notificationText } from './notifications'
import { useLocale } from './i18n'

const event = (id: string, kind: UserNotification['kind'] = 'broken', patch: Partial<UserNotification> = {}): UserNotification => ({ id, kind, createdAt: `2026-11-11T12:00:0${id.slice(-1)}Z`, read: false, taskId: 'sum', taskTitle: 'Sum', submissionId: 'sub-' + id, ...patch })
const page = (items: UserNotification[], patch: Partial<NotificationPage> = {}): NotificationPage => ({ items, unreadCount: items.length, enabled: true, showBreakerIdentity: true, breakImpactVisibility: 'usernames', ...patch })

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('window', { setTimeout })
  useLocale.setState({ locale: 'en' })
  useAuthStore.setState({ user: { id: 'player-a' } as User, token: 'session-a' })
  useToastStore.getState().clear()
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); useToastStore.getState().clear(); useAuthStore.setState({ user: null, token: null }); useLocale.setState({ locale: 'en' }) })

describe('notification delivery', () => {
  it('keeps old unread events in history without replaying them, and never echoes client notices', () => {
    const tracker = new NotificationTracker()
    const old = event('1')
    expect(tracker.observe([old])).toEqual([])
    const accepted = event('2', 'accepted')
    expect(tracker.observe([event('3', 'info', { message: 'Saved.' }), accepted, old])).toEqual([accepted])
    expect(tracker.observe([accepted, old])).toEqual([])
    expect(tracker.observe([event('4', 'broken', { read: true }), accepted])).toEqual([])
  })
  it('orders coalesced deliveries by the time the break happened, and uses past tense for historical events', () => {
    const tracker = new NotificationTracker()
    tracker.observe([])
    const repaired = event('1', 'repaired', { occurredAt: '2026-11-11T11:02:00Z', historical: true })
    const broken = event('2', 'broken', { occurredAt: '2026-11-11T11:01:00Z', historical: true })
    expect(tracker.observe([repaired, broken])).toEqual([broken, repaired])
    expect(notificationText(broken)).toBe('Sum · solution was broken')
    expect(notificationText(repaired)).toBe('Sum · passed again')
  })
  it('shows an immediate submission outcome once, with fireworks, even when polling returns the same event', () => {
    const create = vi.spyOn(api, 'createNotification').mockResolvedValue(event('9', 'success'))
    const accepted = event('1', 'accepted')
    notificationToast(accepted)
    notificationToast(accepted)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0].effect).toBe('fireworks')
    expect(create).not.toHaveBeenCalled()
    notificationToast(event('2', 'broken'))
    expect(useToastStore.getState().toasts[1].effect).toBe('destruction')
  })
  it('stores ordinary popups in server history without converting structured game events into messages', async () => {
    const create = vi.spyOn(api, 'createNotification').mockResolvedValue(event('9', 'info'))
    toast('info', 'Saved.')
    expect(create).toHaveBeenCalledExactlyOnceWith('info', 'Saved.')
    expect(useToastStore.getState().toasts[0].message).toBe('Saved.')
    await Promise.resolve()
  })
  it('redacts active popups when disclosure changes, and removes hidden or disabled game events', () => {
    const broken = event('1', 'broken', { breaker: { userId: 'other', username: 'News' } })
    const breaking = event('2', 'breaking', { impact: { userCount: 2, usernames: ['News', 'Tasks'] } })
    notificationToast(broken); notificationToast(breaking)
    useToastStore.getState().syncNotifications(page([], { showBreakerIdentity: false, breakImpactVisibility: 'count' }))
    expect(useToastStore.getState().toasts[0].notification?.breaker).toBeUndefined()
    expect(useToastStore.getState().toasts[1].notification?.impact).toEqual({ userCount: 2 })
    useToastStore.getState().syncNotifications(page([], { breakImpactVisibility: 'hidden' }))
    expect(useToastStore.getState().toasts).toHaveLength(1)
    useToastStore.getState().syncNotifications(page([], { enabled: false }))
    expect(useToastStore.getState().toasts).toEqual([])
  })
  it('clears pending popups and delivery memory when switching accounts or signing out', () => {
    notificationToast(event('1'))
    useAuthStore.setState({ user: { id: 'player-b' } as User, token: 'session-b' })
    expect(useToastStore.getState().toasts).toEqual([])
    expect(useToastStore.getState().delivered.size).toBe(0)
    notificationToast(event('1'))
    expect(useToastStore.getState().toasts).toHaveLength(1)
    useAuthStore.setState({ user: null, token: null })
    expect(useToastStore.getState().toasts).toEqual([])
  })
})

describe('notification presentation', () => {
  it('localizes labels while preserving task titles and logins', () => {
    useLocale.setState({ locale: 'ru' })
    expect(notificationText(event('1', 'broken', { breaker: { userId: 'n', username: 'News' } }), 'Tasks')).toBe('Tasks · решение было сломано игроком News')
    expect(notificationText(event('2', 'breaking', { impact: { userCount: 2 } }))).toBe('Sum · вы сломали решения: 2 игроков')
    expect(notificationText(event('3', 'broken'))).not.toContain('News')
  })
  it('renders Broken distinctly and only renders disclosed impact data as escaped text', () => {
    expect(renderToStaticMarkup(createElement(StatusPill, { status: 'BROKEN' }))).toContain('Broken')
    const count = renderToStaticMarkup(createElement(BreakImpactBadge, { impact: { userCount: 2 } }))
    expect(count).toContain('2 players')
    expect(count).not.toContain('News')
    const names = renderToStaticMarkup(createElement(BreakImpactBadge, { impact: { userCount: 1, usernames: ['<script>'] } }))
    expect(names).toContain('&lt;script&gt;')
    expect(names).not.toContain('<script>')
  })
})
