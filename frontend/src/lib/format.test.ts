import { describe, expect, it } from 'vitest'
import { formatLwlang } from './format'

describe('mock formatter', () => {
  it('normalizes tabs, trailing whitespace and indentation', () => {
    const input = 'fn f() {\n\treturn 0   \n}\n'
    expect(formatLwlang(input)).toBe('fn f() {\n  return 0\n}\n')
  })

  it('indents nested blocks', () => {
    const input = 'fn f() {\nif true {\nreturn 1\n}\n}\n'
    expect(formatLwlang(input)).toBe('fn f() {\n  if true {\n    return 1\n  }\n}\n')
  })

  it('keeps at most one blank line', () => {
    const input = 'fn f() {\n\n\n\n  return 0\n}\n'
    expect(formatLwlang(input)).toBe('fn f() {\n\n  return 0\n}\n')
  })
})
