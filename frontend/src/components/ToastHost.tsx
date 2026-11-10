import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore } from '@/store/ui'

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const

export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind]
        return (
          <div className={`toast toast-${toast.kind}`} key={toast.id}>
            <Icon size={16} color={toast.kind === 'error' ? 'var(--magenta)' : 'var(--cyan)'} />
            <span className="grow">{toast.message}</span>
            <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
