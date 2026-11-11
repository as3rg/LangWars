import { diffLines } from 'diff'
import type { DiffHunk } from '@/api/types'

export function submissionDiff(previous: string, current: string): DiffHunk[] | undefined {
  // Code is untrusted. Avoid blocking the UI on an adversarial edit distance.
  const parts = diffLines(previous, current, { timeout: 120, maxEditLength: 2000 })
  if (!parts) return undefined
  const hunks: DiffHunk[] = []
  let oldLine = 1
  let newLine = 1
  for (const part of parts) {
    const lines = part.value.split('\n')
    if (lines.at(-1) === '') lines.pop()
    for (const text of lines) {
      if (part.added) hunks.push({ type: 'add', newLine: newLine++, text })
      else if (part.removed) hunks.push({ type: 'del', oldLine: oldLine++, text })
      else hunks.push({ type: 'ctx', oldLine: oldLine++, newLine: newLine++, text })
    }
  }
  return hunks
}
