import type { SpeakStmt } from '../ast'
import { walk } from '../ast'
import type { RawDiagnostic } from '../diagnostics'
import type { AddonPack, AstContext } from './types'

export function speakArgumentPass(ctx: AstContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  walk(ctx.ast, (node) => {
    if (node.type !== 'SpeakStmt') return
    const speak = node as SpeakStmt
    if (speak.value === null) {
      out.push({
        severity: 'warning',
        message: 'speak needs a value (did you mean `speak "nya"`?)',
        code: 'SPEAK01',
        from: speak.from,
        to: speak.to,
      })
    }
  })
  return out
}

export const speakPack: AddonPack = {
  id: 'speak',
  title: 'Voice (v0.3)',
  description: 'Adds the `speak` statement plus `len` and `push` builtins.',
  kind: 'language',
  keywords: ['speak'],
  astPasses: [speakArgumentPass],
}
