import type { AstNode, BinaryExpr, MatchArm, MatchStmt } from '../ast'
import { walk } from '../ast'
import type { RawDiagnostic } from '../diagnostics'
import type { AddonPack, AstContext } from './types'

function patternKey(pattern: AstNode): string | null {
  if (pattern.type === 'WildcardPattern') return null
  if (pattern.type === 'NamedPattern') {
    const named = pattern as AstNode & { name: string }
    return `named:${named.name.toLowerCase()}`
  }
  if (pattern.type === 'LiteralPattern') {
    const literal = (pattern as AstNode & { value: AstNode }).value
    if (literal.type === 'NumberLit') {
      const number = literal as AstNode & { value: number }
      return `num:${number.value}`
    }
    if (literal.type === 'StringLit') {
      const string = literal as AstNode & { value: string }
      return `str:${string.value}`
    }
    if (literal.type === 'BoolLit') {
      const bool = literal as AstNode & { value: boolean }
      return `bool:${bool.value}`
    }
  }
  return `node:${pattern.type}:${pattern.from}`
}

export function exhaustivenessPass(ctx: AstContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  walk(ctx.ast, (node) => {
    if (node.type !== 'MatchStmt') return
    const match = node as MatchStmt
    if (!match.hasWildcard && match.arms.length > 0) {
      out.push({
        severity: 'warning',
        message: 'match has no `_` arm; it may not be exhaustive',
        code: 'MATCH01',
        from: match.from,
        to: match.subject.to,
      })
    }
  })
  return out
}

export function duplicateCasePass(ctx: AstContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  walk(ctx.ast, (node) => {
    if (node.type !== 'MatchStmt') return
    const match = node as MatchStmt
    const seen = new Map<string, MatchArm>()
    for (const arm of match.arms) {
      const key = patternKey(arm.pattern)
      if (key === null) continue
      if (seen.has(key)) {
        const previous = seen.get(key)!
        out.push({
          severity: 'warning',
          message: `Duplicate case; first seen at offset ${previous.pattern.from}`,
          code: 'MATCH02',
          from: arm.pattern.from,
          to: arm.pattern.to,
        })
      } else {
        seen.set(key, arm)
      }
    }
  })
  return out
}

export function catTypePass(ctx: AstContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  walk(ctx.ast, (node) => {
    if (node.type !== 'BinaryExpr') return
    const binary = node as BinaryExpr
    if (binary.op !== 'cat') return
    for (const side of [binary.left, binary.right]) {
      if (side.type === 'NumberLit' || side.type === 'BoolLit') {
        out.push({
          severity: 'info',
          message: 'cat will stringify this literal; consider a string operand',
          code: 'SPEAK02',
          from: side.from,
          to: side.to,
        })
      }
    }
  })
  return out
}

export const matchPack: AddonPack = {
  id: 'match',
  title: 'Pattern matching (v0.2)',
  description: 'Adds `match`, `case`, `_` and the `cat` operator with exhaustiveness checks.',
  kind: 'language',
  keywords: ['match', 'case', 'cat'],
  astPasses: [exhaustivenessPass, duplicateCasePass, catTypePass],
}
