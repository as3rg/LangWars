import type { AstNode, CallExpr, FnDecl, LetStmt } from '../ast'
import { walk } from '../ast'
import type { RawDiagnostic } from '../diagnostics'
import type { AddonPack, AstContext, SourceContext } from './types'

function lineDiagnostic(
  ctx: SourceContext,
  lineIndex: number,
  column: number,
  message: string,
  code: string,
  severity: RawDiagnostic['severity'],
  length = 1,
): RawDiagnostic {
  const from = ctx.lineStarts[lineIndex] + column
  return { severity, message, code, from, to: from + length }
}

export function trailingWhitespacePass(ctx: SourceContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  ctx.lines.forEach((line, index) => {
    const match = /[ \t]+$/.exec(line)
    if (match) {
      out.push(
        lineDiagnostic(
          ctx,
          index,
          match.index,
          'Trailing whitespace',
          'STYLE001',
          'warning',
          match[0].length,
        ),
      )
    }
  })
  return out
}

export function tabsPass(ctx: SourceContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  ctx.lines.forEach((line, index) => {
    const column = line.indexOf('\t')
    if (column >= 0) {
      out.push(lineDiagnostic(ctx, index, column, 'Tabs are not allowed; use 2 spaces', 'STYLE002', 'warning'))
    }
  })
  return out
}

export function longLinePass(ctx: SourceContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  ctx.lines.forEach((line, index) => {
    if (line.length > 100) {
      out.push(
        lineDiagnostic(ctx, index, 100, `Line is ${line.length} chars (limit 100)`, 'STYLE003', 'info'),
      )
    }
  })
  return out
}

const SNAKE_CASE = /^[a-z][a-z0-9_]*$/

export function namingPass(ctx: AstContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  walk(ctx.ast, (node) => {
    if (node.type === 'FnDecl') {
      const fn = node as FnDecl
      if (!SNAKE_CASE.test(fn.name)) {
        out.push({
          severity: 'warning',
          message: `Function '${fn.name}' should be snake_case`,
          code: 'NAME001',
          from: fn.nameFrom,
          to: fn.nameTo,
        })
      }
    }
  })
  return out
}

export function unusedLetPass(ctx: AstContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  const reads = new Map<string, number>()
  const lets: LetStmt[] = []

  walk(ctx.ast, (node) => {
    if (node.type === 'Ident') {
      reads.set(node.name, (reads.get(node.name) ?? 0) + 1)
    }
    if (node.type === 'LetStmt') {
      lets.push(node as LetStmt)
    }
  })

  for (const letNode of lets) {
    if (letNode.name.startsWith('_')) continue
    if (!reads.has(letNode.name)) {
      out.push({
        severity: 'warning',
        message: `'${letNode.name}' is declared but never used`,
        code: 'UNUSED01',
        from: letNode.nameFrom,
        to: letNode.nameTo,
      })
    }
  }
  return out
}

const CONTROL_FLOW = new Set(['IfStmt', 'WhileStmt', 'ForStmt', 'MatchStmt'])

export function recursionPass(ctx: AstContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  walk(ctx.ast, (node) => {
    if (node.type !== 'FnDecl') return
    const fn = node as FnDecl
    let selfCall: CallExpr | null = null
    let hasBase = false
    walk(fn.body, (child) => {
      if (CONTROL_FLOW.has(child.type)) hasBase = true
      if (child.type === 'CallExpr') {
        const call = child as CallExpr
        if (call.callee.type === 'Ident' && call.callee.name === fn.name) {
          selfCall = call
        }
      }
    })
    if (selfCall && !hasBase) {
      const call = selfCall as CallExpr
      out.push({
        severity: 'warning',
        message: `Recursive function '${fn.name}' has no base case`,
        code: 'NOBASE01',
        from: call.from,
        to: call.to,
      })
    }
  })
  return out
}

const BUILTIN_ARITY: Record<string, number> = { len: 1, push: 2, print: 1 }

export function callArityPass(ctx: AstContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  const arity = new Map<string, number>()
  walk(ctx.ast, (node) => {
    if (node.type === 'FnDecl') {
      const fn = node as FnDecl
      arity.set(fn.name, fn.params.length)
    }
  })
  walk(ctx.ast, (node) => {
    if (node.type !== 'CallExpr') return
    const call = node as CallExpr
    if (call.callee.type !== 'Ident') return
    const name = call.callee.name
    const expected = BUILTIN_ARITY[name] ?? arity.get(name)
    if (expected === undefined) return
    if (call.args.length !== expected) {
      out.push({
        severity: 'warning',
        message: `${name} expects ${expected} argument${expected === 1 ? '' : 's'}, got ${call.args.length}`,
        code: 'CALL001',
        from: call.from,
        to: call.to,
      })
    }
  })
  return out
}

const TYPES = new Set(['int', 'float', 'bool', 'str', 'arr'])

export function obviousTypePass(ctx: AstContext): RawDiagnostic[] {
  const out: RawDiagnostic[] = []
  const mismatched = (annotation: string, node: AstNode): boolean => {
    if (!TYPES.has(annotation)) return false
    if (node.type === 'NumberLit') {
      const number = node as { isFloat: boolean }
      return annotation === 'int' ? number.isFloat : annotation === 'float' ? !number.isFloat : true
    }
    if (node.type === 'StringLit') return annotation !== 'str'
    if (node.type === 'BoolLit') return annotation !== 'bool'
    if (node.type === 'ArrayLit') return annotation !== 'arr'
    return false
  }

  walk(ctx.ast, (node) => {
    if (node.type !== 'LetStmt') return
    const letNode = node as LetStmt
    if (letNode.annotation && letNode.init && mismatched(letNode.annotation, letNode.init)) {
      out.push({
        severity: 'warning',
        message: `Binding annotated '${letNode.annotation}' but initializer looks different`,
        code: 'TYPE001',
        from: letNode.nameFrom,
        to: letNode.init.to,
      })
    }
  })
  return out
}

export const corePack: AddonPack = {
  id: 'core',
  title: 'Core language',
  description: 'Syntax, style and semantic sanity passes for LWLang v0.1+.',
  kind: 'language',
  keywords: [],
  sourcePasses: [trailingWhitespacePass, tabsPass, longLinePass],
  astPasses: [namingPass, unusedLetPass, recursionPass, callArityPass, obviousTypePass],
}
