import { useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { Bell, CheckCheck, X } from 'lucide-react'
import { api } from '@/api/client'
import type { NotificationPage, SubmissionCursor, UserNotification } from '@/api/types'
import { useSession, useTasks } from '@/api/hooks'
import { NotificationTracker, notificationText } from '@/lib/notifications'
import { formatDateTime, formatRelative } from '@/lib/time'
import { t, useLocale } from '@/lib/i18n'
import { notificationToast, useToastStore } from '@/store/ui'
import { SubmissionModal } from './SubmissionModal'
import { ErrorNotice, GlowButton } from './ui'

export function NotificationBell() {
  useLocale()
  const { token, user } = useSession()
  const tasks = useTasks()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<{ id: string; scope: string } | null>(null)
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const scope = `${user?.id ?? ''}:${token ?? ''}`
  const tracker = useRef({ scope, enabled: undefined as boolean | undefined, value: new NotificationTracker() })
  if (tracker.current.scope !== scope) tracker.current = { scope, enabled: undefined, value: new NotificationTracker() }
  const queryKey = ['notifications', user?.id ?? '', token] as const
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as SubmissionCursor | undefined,
    queryFn: ({ pageParam }) => api.notifications(pageParam),
    getNextPageParam: (page): SubmissionCursor | undefined => {
      const last = page.items.at(-1)
      return page.items.length === 50 && last ? { beforeCreated: last.createdAt, beforeId: last.id } : undefined
    },
    enabled: Boolean(user && token),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })
  const first = query.data?.pages[0]
  const items = useMemo(() => [...new Map(query.data?.pages.flatMap((page) => page.items).map((item) => [item.id, item]) ?? []).values()].sort((left, right) => (right.occurredAt ?? right.createdAt).localeCompare(left.occurredAt ?? left.createdAt) || right.id.localeCompare(left.id)), [query.data])
  const markRead = useMutation({
    mutationFn: (ids?: string[]) => api.readNotifications(ids),
    onSuccess: () => client.invalidateQueries({ queryKey }),
  })

  useEffect(() => {
    setOpen(false); setSelected(null)
  }, [scope])

  useEffect(() => {
    if (!first || !user || !token) return
    if (tracker.current.enabled !== undefined && tracker.current.enabled !== first.enabled) tracker.current.value = new NotificationTracker()
    tracker.current.enabled = first.enabled
    useToastStore.getState().syncNotifications(first)
    const fresh = tracker.current.value.observe(first.items)
    if (first.enabled) for (const item of fresh) notificationToast(item)
    if (fresh.length) {
      for (const key of ['tasks', 'task', 'taskSubmissions', 'submissions', 'rating', 'me']) void client.invalidateQueries({ queryKey: [key] })
    }
  }, [first, scope, user, token, client])

  useEffect(() => {
    if (!open && (query.data?.pages.length ?? 0) > 1) {
      client.setQueryData<InfiniteData<NotificationPage, SubmissionCursor | undefined>>(queryKey, (data) => data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data)
    }
  }, [open, query.data?.pages.length, client, scope])

  useEffect(() => {
    if (!open) return
    const click = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', click)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', click); document.removeEventListener('keydown', key) }
  }, [open])

  if (!user) return null
  const read = (item: UserNotification) => {
    if (!item.read) markRead.mutate([item.id])
    if (item.submissionId) { setSelected({ id: item.submissionId, scope }); setOpen(false) }
  }
  return <div className="notification-bell" ref={wrapper}>
    <button ref={trigger} className="icon-btn notification-trigger" aria-label={t('Notifications')} title={t('Notifications')} aria-expanded={open} aria-controls="notification-panel" onClick={() => { if (!open) void query.refetch(); setOpen((value) => !value) }}>
      <Bell size={17} />{Boolean(first?.unreadCount) && <span className="notification-count">{first!.unreadCount > 99 ? '99+' : first!.unreadCount}</span>}
    </button>
    {open && <section id="notification-panel" className="notification-panel panel" aria-label={t('Notifications')}>
      <div className="row-between notification-panel-head"><span>{t('Notifications')}</span><div className="row" style={{ gap: 6 }}>
        <button className="icon-btn" title={t('Mark all read')} aria-label={t('Mark all read')} disabled={!first?.unreadCount || markRead.isPending} onClick={() => markRead.mutate(undefined)}><CheckCheck size={16} /></button>
        <button className="icon-btn" title={t('Close')} aria-label={t('Close')} onClick={() => setOpen(false)}><X size={16} /></button>
      </div></div>
      {(query.error || markRead.error) && <ErrorNotice message={t('Could not update notifications.')} />}
      <div className="notification-list">
        {query.isLoading && <p className="muted notification-empty">{t('Loading…')}</p>}
        {!query.isLoading && !items.length && <p className="muted notification-empty">{t('No notifications yet.')}</p>}
        {items.map((item) => <button key={item.id} className={`notification-entry${item.read ? '' : ' unread'}`} onClick={() => read(item)}>
          <span className={`notification-dot notification-${item.kind}`} aria-hidden="true" />
          <span><span className="notification-message">{notificationText(item, tasks.data?.find((task) => task.id === item.taskId)?.title)}</span><time className="notification-time" dateTime={item.occurredAt ?? item.createdAt} title={formatDateTime(item.occurredAt ?? item.createdAt)}>{formatRelative(item.occurredAt ?? item.createdAt)}</time></span>
        </button>)}
      </div>
      {query.hasNextPage && <div className="notification-panel-foot"><GlowButton size="sm" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{t('Older notifications')}</GlowButton></div>}
    </section>}
    {selected?.scope === scope && <SubmissionModal id={selected.id} onClose={() => setSelected(null)} />}
  </div>
}
