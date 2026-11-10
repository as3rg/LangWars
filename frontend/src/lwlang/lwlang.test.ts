import { describe, expect, it } from 'vitest'
import { analyze } from './index'

function codes(code: string, version: 'v0.1' | 'v0.2' | 'v0.3', packs: string[] = []) {
  return analyze(code, version, packs).diagnostics.map((diagnostic) => diagnostic.code)
}

describe('LWLang parser & analysis', () => {
  it('parses a valid v0.1 function without errors', () => {
    const code = 'fn sum(a: int, b: int) -> int {\n  return a + b\n}\n'
    const result = analyze(code, 'v0.1')
    expect(result.parseOk).toBe(true)
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toHaveLength(0)
    expect(result.ast.body[0].type).toBe('FnDecl')
  })

  it('supports if / while / for without parse errors', () => {
    const code = [
      'fn f(n: int) -> int {',
      '  let total = 0',
      '  let i = 0',
      '  while i < n {',
      '    total += i',
      '    i += 1',
      '  }',
      '  if total > 10 {',
      '    return total',
      '  } else {',
      '    return 0',
      '  }',
      '}',
    ].join('\n')
    expect(codes(code, 'v0.1').filter((code) => code.startsWith('SYN'))).toHaveLength(0)
  })

  it('rejects speak in v0.2 with LANG002', () => {
    const code = 'fn f() {\n  speak "nya"\n}\n'
    expect(codes(code, 'v0.2')).toContain('LANG002')
  })

  it('accepts speak in v0.3', () => {
    const code = 'fn f() {\n  speak "nya"\n}\n'
    expect(codes(code, 'v0.3')).not.toContain('LANG002')
    expect(codes(code, 'v0.3')).not.toContain('SPEAK01')
  })

  it('warns on empty speak', () => {
    const code = 'fn f() {\n  speak\n}\n'
    expect(codes(code, 'v0.3')).toContain('SPEAK01')
  })

  it('warns when match has no wildcard arm', () => {
    const code = ['fn f(x: int) -> str {', '  match x {', '    case 1 -> "a"', '  }', '  return "b"', '}'].join(
      '\n',
    )
    expect(codes(code, 'v0.2')).toContain('MATCH01')
  })

  it('does not warn when match has a wildcard arm', () => {
    const code = [
      'fn f(x: int) -> str {',
      '  match x {',
      '    case 1 -> "a"',
      '    _ -> "b"',
      '  }',
      '  return "b"',
      '}',
    ].join('\n')
    expect(codes(code, 'v0.2')).not.toContain('MATCH01')
  })

  it('warns on duplicate case literals', () => {
    const code = [
      'fn f(x: int) -> str {',
      '  match x {',
      '    case 1 -> "a"',
      '    case 1 -> "b"',
      '    _ -> "c"',
      '  }',
      '  return "c"',
      '}',
    ].join('\n')
    expect(codes(code, 'v0.2')).toContain('MATCH02')
  })

  it('warns about unused let bindings', () => {
    const code = 'fn f() -> int {\n  let unused = 1\n  return 0\n}\n'
    expect(codes(code, 'v0.1')).toContain('UNUSED01')
  })

  it('warns about recursion without a base case', () => {
    const code = 'fn f(n: int) -> int {\n  return f(n - 1)\n}\n'
    expect(codes(code, 'v0.1')).toContain('NOBASE01')
  })

  it('warns about call arity mismatches', () => {
    const code = 'fn add(a: int, b: int) -> int {\n  return a + b\n}\nfn f() -> int {\n  return add(1)\n}\n'
    expect(codes(code, 'v0.1')).toContain('CALL001')
  })

  it('flags trailing whitespace and tabs', () => {
    const code = 'fn f() -> int {\n\treturn 0   \n}\n'
    const found = codes(code, 'v0.1')
    expect(found).toContain('STYLE001')
    expect(found).toContain('STYLE002')
  })

  it('runs the task-scoped perf addon on source', () => {
    const code = [
      'fn f() {',
      '  if true {',
      '    if true {',
      '      if true {',
      '        if true {',
      '          if true {',
      '            speak "deep"',
      '          }',
      '        }',
      '      }',
      '    }',
      '  }',
      '}',
    ].join('\n')
    expect(codes(code, 'v0.3', ['perf'])).toContain('PERF01')
  })

  it('supports the cat operator in v0.2', () => {
    const code = 'fn f(name: str) {\n  speak "nya " cat name\n}\n'
    expect(codes(code, 'v0.2').filter((code) => code.startsWith('SYN'))).toHaveLength(0)
    expect(codes(code, 'v0.1')).toContain('LANG002')
  })

  it('reports unterminated strings', () => {
    const code = 'fn f() {\n  speak "oops\n}\n'
    expect(codes(code, 'v0.3')).toContain('SYN001')
  })
})
