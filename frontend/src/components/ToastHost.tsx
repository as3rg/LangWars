import { t, useLocale } from '@/lib/i18n'
import { AlertCircle, CheckCircle2, Info, X, Zap } from 'lucide-react'
import { useToastStore, type Toast } from '@/store/ui'
import { notificationText, notificationTone } from '@/lib/notifications'
import { useTasks } from '@/api/hooks'
import type { CSSProperties } from 'react'

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const

export function ToastCard({ toast, taskTitle, onDismiss }: { toast: Toast; taskTitle?: string; onDismiss: () => void }) {
  const tone = notificationTone(toast.notification?.kind ?? toast.kind)
  const Icon = toast.notification?.kind === 'breaking' ? Zap : ICONS[toast.kind]
  return <div className={`toast notification-tone-${tone}${toast.effect ? ` toast-${toast.effect}` : ''}`}>
    {toast.effect === 'fireworks' && <span className="toast-burst" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ '--ray': index % 12, '--wave': Math.floor(index / 12) } as CSSProperties} />)}</span>}
    {toast.effect === 'destruction' && <span className="toast-static" aria-hidden="true"><span>0101 // SIGNAL LOST // 1010</span></span>}
    {toast.effect === 'breaking' && <span className="toast-impact" aria-hidden="true" />}
    <Icon className="toast-icon" size={18} />
    <span className="grow toast-message">{toast.notification ? notificationText(toast.notification, taskTitle) : t(toast.message)}</span>
    <button className="icon-btn toast-dismiss" style={{ width: 22, height: 22 }} onClick={onDismiss} aria-label={t('Dismiss')}><X size={12} /></button>
  </div>
}

export function ToastHost() {
  useLocale()
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)
  const tasks = useTasks()

  if (toasts.length === 0) return null

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((toast) => <ToastCard key={toast.id} toast={toast} taskTitle={tasks.data?.find((task) => task.id === toast.notification?.taskId)?.title} onDismiss={() => dismiss(toast.id)} />)}
    </div>
  )
}
