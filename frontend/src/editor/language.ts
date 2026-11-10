import { StreamLanguage, type StreamParser } from '@codemirror/language'
import { snippet, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import type { LangVersion } from '@/lwlang'

const KEYWORDS = ['let', 'fn', 'return', 'if', 'else', 'while', 'comefrom', 'and', 'or', 'not']
const TYPES = ['int', 'string', 'list', 'dict']
const BUILTINS = ['eq', 'cmp', 'get', 'set', 'length', 'empty', 'contains', 'push_back', 'truthy', 'concat', 'swap', '__builtin_eq__', '__builtin_lt__', '__builtin_get__', '__builtin_set__', '__builtin_length__', '__builtin_concat__', ...TYPES]
const ANNOTATIONS = ['solution', 'eq', 'cmp', 'cast', 'get', 'set', 'length', 'empty', 'contains', 'push_back', 'truthy', 'concat']
interface LwState { inBlockComment: boolean }
export function createLwlangLanguage(_version: LangVersion, _extraKeywords: string[] = []) {
  const parser: StreamParser<LwState> = {
    name: 'lwlang', startState: () => ({ inBlockComment: false }),
    token(stream, state) {
      if (state.inBlockComment) { if (stream.skipTo('*/')) { stream.match('*/'); state.inBlockComment = false } else stream.skipToEnd(); return 'comment' }
      if (stream.eatSpace()) return null
      if (stream.match('//')) { stream.skipToEnd(); return 'comment' }
      if (stream.match('/*')) { state.inBlockComment = true; return 'comment' }
      if (stream.match(/^"(?:\\.|[^"\\])*"?/)) return 'string'
      if (stream.match(/^[0-9]+/)) return 'number'
      if (stream.match(/^@[a-z_]+/)) return 'meta'
      if (stream.match(/^[A-Za-z_][A-Za-z0-9_]*/)) { const word = stream.current(); if (TYPES.includes(word)) return 'typeName'; if (KEYWORDS.includes(word)) return 'keyword'; if (BUILTINS.includes(word) || word.startsWith('__builtin_')) return 'builtin'; return 'variableName' }
      if (stream.match(/^(?:!=|<=|>=|[+\-*/%<>=])/)) return 'operator'
      if (stream.match(/^[{}[\]()]/)) return 'bracket'
      if (stream.match(/^[,:;]/)) return 'punctuation'
      stream.next(); return null
    },
  }
  return StreamLanguage.define(parser)
}
export function createCompletions(_version: LangVersion, _extraKeywords: string[] = []) {
  const options: Completion[] = [
    ...KEYWORDS.filter((word) => !['fn', 'if', 'while', 'let'].includes(word)).map((label) => ({ label, type: 'keyword' })),
    ...BUILTINS.map((label) => ({ label, type: 'function', detail: 'standard operation' })),
    ...ANNOTATIONS.map((word) => ({ label: `@${word}`, type: 'keyword' })),
    { label: 'fn', type: 'keyword', apply: snippet('fn ${name}(${value}) {\n  return ${value};\n}') },
    { label: 'if', type: 'keyword', apply: snippet('if (${condition}) {\n  ${}\n}') },
    { label: 'while', type: 'keyword', apply: snippet('while (${condition}) {\n  ${}\n}') },
    { label: 'let', type: 'keyword', apply: snippet('let ${name} = ${0};') },
    { label: '@solution', type: 'keyword', detail: 'test entry point', apply: snippet('@solution\nfn ${answer}(${value}) {\n  return ${value};\n}') },
  ]
  return (context: CompletionContext): CompletionResult | null => { const word = context.matchBefore(/@?[A-Za-z_][A-Za-z_]*/); if (!word || (word.from === word.to && !context.explicit)) return null; return { from: word.from, options, validFor: /^@?[A-Za-z_]*$/ } }
}
