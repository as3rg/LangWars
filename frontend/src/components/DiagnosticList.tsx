import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { Severity } from '@/api/types'
import { positionAt } from '@/lwlang'

export interface UiDiagnostic {
  severity: Severity
  message: string
  code: string
  addonId: string
  from: number
  to: number
}

interface DiagnosticListProps {
  diagnostics: UiDiagnostic[]
  code: string
  onSelect?: (diagnostic: UiDiagnostic) => void
}

const ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const

export function DiagnosticList({ diagnostics, code, onSelect }: DiagnosticListProps) {
  if (diagnostics.length === 0) {
    return (
      <div className="problems-empty">
        <CheckCircle2 size={15} color="var(--cyan)" />
        No problems detected. Neko-9 approves.
      </div>
    )
  }

  return (
    <div className="problems-list">
      {diagnostics.map((diagnostic, index) => {
        const Icon = ICONS[diagnostic.severity]
        const position = positionAt(code, diagnostic.from)
        return (
          <button
            type="button"
            className="diagnostic-row"
            key={`${diagnostic.code}-${diagnostic.from}-${index}`}
            onClick={() => onSelect?.(diagnostic)}
          >
            <Icon size={14} className={`diagnostic-sev ${diagnostic.severity}`} />
            <span className="diagnostic-msg">
              {diagnostic.message}
              <span className="diagnostic-meta">
                {diagnostic.code} · {diagnostic.addonId} · line {position.line}:{position.column}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
