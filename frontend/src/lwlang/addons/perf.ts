import type { ForStmt, WhileStmt } from '../ast'
import { walk } from '../ast'
import type { RawDiagnostic } from '../diagnostics'
import type { AddonPack, AstContext, SourceContext } from './types'

const MAX_DEPTH = 4

function stripNoise(line: string): string {
  return line
    .replace(/\/\/.*$/, '')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'/g, '')
}

export function deepNestingPass(ctx: SourceContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  let depth = 0
  ctx.lines.forEach((line, index) => {
    if (depth > MAX_DEPTH) {
      const from = ctx.lineStarts[index]
      out.push({
        severity: 'warning',
        message: `Block nesting is ${depth} levels deep (limit ${MAX_DEPTH})`,
        code: 'PERF01',
        from,
        to: from + Math.max(1, line.length),
      })
    }
    const stripped = stripNoise(line)
    for (const ch of stripped) {
      if (ch === '{') depth += 1
      else if (ch === '}') depth = Math.max(0, depth - 1)
    }
  })
  return out
}

export function loopSizePass(ctx: AstContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  walk(ctx.ast, (node) => {
    if (node.type !== 'WhileStmt' && node.type !== 'ForStmt') return
    const loop = node as WhileStmt | ForStmt
    if (loop.body.body.length > 40) {
      out.push({
        severity: 'info',
        message: `Loop body has ${loop.body.body.length} statements; consider extracting a function`,
        code: 'PERF02',
        from: loop.from,
        to: loop.body.from,
      })
    }
  })
  return out
}

export const perfPack: AddonPack = {
  id: 'perf',
  title: 'Meowtrics (task addon)',
  description: 'Task-specific performance heuristics: nesting depth and loop size.',
  kind: 'task',
  keywords: [],
  sourcePasses: [deepNestingPass],
  astPasses: [loopSizePass],
}
