export type Severity = 'error' | 'warning' | 'info'

export interface Diagnostic {
  severity: Severity
  message: string
  code: string
  addonId: string
  from: number
  to: number
}

export interface RawDiagnostic {
  severity: Severity
  message: string
  code: string
  from: number
  to: number
}

export function severityRank(severity: Severity): number {
  return severity === 'error' ? 0 : severity === 'warning' ? 1 : 2
}

export function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from
    const bySeverity = severityRank(a.severity) - severityRank(b.severity)
    if (bySeverity !== 0) return bySeverity
    return a.code.localeCompare(b.code)
  })
}

export interface Position {
  line: number
  column: number
}

export function positionAt(code: string, offset: number): Position {
  const clamped = Math.max(0, Math.min(offset, code.length))
  let line = 1
  let column = 1
  for (let i = 0; i < clamped; i++) {
    if (code.charCodeAt(i) === 10) {
      line += 1
      column = 1
    } else {
      column += 1
    }
  }
  return { line, column }
}

export function offsetOfLine(code: string, line: number): number {
  if (line <= 1) return 0
  let current = 1
  for (let i = 0; i < code.length; i++) {
    if (code.charCodeAt(i) === 10) {
      current += 1
      if (current === line) return i + 1
    }
  }
  return code.length
}

export function countBySeverity(diagnostics: Diagnostic[]): Record<Severity, number> {
  return diagnostics.reduce<Record<Severity, number>>(
    (acc, diagnostic) => {
      acc[diagnostic.severity] += 1
      return acc
    },
    { error: 0, warning: 0, info: 0 },
  )
}
