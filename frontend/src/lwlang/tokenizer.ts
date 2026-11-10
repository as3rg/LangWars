import type { RawDiagnostic } from './diagnostics'
import { isKeyword } from './version'

export type TokenType = 'ident' | 'keyword' | 'number' | 'string' | 'operator' | 'punct' | 'comment' | 'eof'

export interface Token {
  type: TokenType
  value: string
  from: number
  to: number
}

export interface TokenizeResult {
  tokens: Token[]
  errors: RawDiagnostic[]
}

const MULTI_CHAR_OPERATORS = ['->', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/='] as const
const SINGLE_CHAR = new Set('+-*/%<>=(){ }[],:.'.replace(/ /g, '').split(''))

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch)
}

export function tokenize(code: string): TokenizeResult {
  const tokens: Token[] = []
  const errors: RawDiagnostic[] = []
  let i = 0

  const push = (type: TokenType, from: number, to: number) => {
    tokens.push({ type, value: code.slice(from, to), from, to })
  }

  while (i < code.length) {
    const ch = code[i]

    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      i += 1
      continue
    }

    if (ch === '/' && code[i + 1] === '/') {
      const start = i
      while (i < code.length && code[i] !== '\n') i += 1
      push('comment', start, i)
      continue
    }

    if (ch === '/' && code[i + 1] === '*') {
      const start = i
      i += 2
      let closed = false
      while (i < code.length) {
        if (code[i] === '*' && code[i + 1] === '/') {
          i += 2
          closed = true
          break
        }
        i += 1
      }
      push('comment', start, i)
      if (!closed) {
        errors.push({
          severity: 'error',
          message: 'Unterminated block comment',
          code: 'SYN002',
          from: start,
          to: code.length,
        })
      }
      continue
    }

    if (isIdentStart(ch)) {
      const start = i
      i += 1
      while (i < code.length && isIdentPart(code[i])) i += 1
      const value = code.slice(start, i)
      push(isKeyword(value) ? 'keyword' : 'ident', start, i)
      continue
    }

    if (isDigit(ch) || (ch === '.' && isDigit(code[i + 1] ?? ''))) {
      const start = i
      while (i < code.length && isDigit(code[i])) i += 1
      let isFloat = false
      if (code[i] === '.' && isDigit(code[i + 1] ?? '')) {
        isFloat = true
        i += 1
        while (i < code.length && isDigit(code[i])) i += 1
      }
      if (!isFloat && (code[i] === 'x' || code[i] === 'X')) {
        i += 1
        while (i < code.length && /[0-9a-fA-F]/.test(code[i])) i += 1
      }
      push('number', start, i)
      continue
    }

    if (ch === '"') {
      const start = i
      i += 1
      let closed = false
      while (i < code.length) {
        if (code[i] === '\\') {
          i += 2
          continue
        }
        if (code[i] === '"') {
          i += 1
          closed = true
          break
        }
        if (code[i] === '\n') break
        i += 1
      }
      push('string', start, i)
      if (!closed) {
        errors.push({
          severity: 'error',
          message: 'Unterminated string literal',
          code: 'SYN001',
          from: start,
          to: Math.min(i + 1, code.length),
        })
      }
      continue
    }

    const multi = MULTI_CHAR_OPERATORS.find((op) => code.startsWith(op, i))
    if (multi) {
      push('operator', i, i + multi.length)
      i += multi.length
      continue
    }

    if (SINGLE_CHAR.has(ch)) {
      const isPunct = '(){}[],:.'.includes(ch)
      push(isPunct ? 'punct' : 'operator', i, i + 1)
      i += 1
      continue
    }

    errors.push({
      severity: 'error',
      message: `Unexpected character '${ch}'`,
      code: 'SYN001',
      from: i,
      to: i + 1,
    })
    i += 1
  }

  tokens.push({ type: 'eof', value: '', from: code.length, to: code.length })
  return { tokens, errors }
}
