import { StreamLanguage, type StreamParser } from '@codemirror/language'
import {
  snippet,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete'
import { builtinsFor, keywordsFor, TYPE_NAMES, type LangVersion } from '@/lwlang'

interface LwState {
  inBlockComment: boolean
}

const MULTI_OPERATORS = /^(->|==|!=|<=|>=|\+=|-=|\*=|\/=)/

export function createLwlangLanguage(version: LangVersion, extraKeywords: string[] = []) {
  const keywordSet = new Set([...keywordsFor(version), ...extraKeywords])
  const builtinSet = new Set(builtinsFor(version))

  const parser: StreamParser<LwState> = {
    name: 'lwlang',
    startState: () => ({ inBlockComment: false }),
    token(stream, state) {
      if (state.inBlockComment) {
        if (stream.skipTo('*/')) {
          stream.match('*/')
          state.inBlockComment = false
        } else {
          stream.skipToEnd()
        }
        return 'comment'
      }

      if (stream.eatSpace()) return null

      if (stream.match('//')) {
        stream.skipToEnd()
        return 'comment'
      }

      if (stream.match('/*')) {
        state.inBlockComment = true
        if (stream.skipTo('*/')) {
          stream.match('*/')
          state.inBlockComment = false
        } else {
          stream.skipToEnd()
        }
        return 'comment'
      }

      if (stream.match(/^"(?:\\.|[^"\\])*"?/)) return 'string'
      if (stream.match(/^[0-9]+(?:\.[0-9]+)?/)) return 'number'

      if (stream.match(/^[A-Za-z_][A-Za-z0-9_]*/)) {
        const word = stream.current()
        if (word === 'true' || word === 'false') return 'bool'
        if (TYPE_NAMES.has(word)) return 'typeName'
        if (keywordSet.has(word)) return 'keyword'
        if (builtinSet.has(word)) return 'builtin'
        if (word === '_') return 'atom'
        return 'variableName'
      }

      if (stream.match(MULTI_OPERATORS)) return 'operator'
      if (stream.match(/^[+\-*/%<>=]/)) return 'operator'
      if (stream.match(/^[{}[\]()]/)) return 'bracket'
      if (stream.match(/^[.,:]/)) return 'punctuation'

      stream.next()
      return null
    },
  }

  return StreamLanguage.define(parser)
}

const SNIPPET_KEYWORDS = new Set(['fn', 'if', 'for', 'match', 'speak'])

export function createCompletions(version: LangVersion, extraKeywords: string[] = []) {
  const keywords = Array.from(new Set([...keywordsFor(version), ...extraKeywords]))
  const builtins = builtinsFor(version)

  const options: Completion[] = [
    ...keywords
      .filter((keyword) => !SNIPPET_KEYWORDS.has(keyword))
      .map<Completion>((keyword) => ({ label: keyword, type: 'keyword' })),
    ...builtins.map<Completion>((builtin) => ({
      label: builtin,
      type: 'function',
      detail: 'builtin',
    })),
    {
      label: 'fn',
      type: 'keyword',
      detail: 'function',
      apply: snippet('fn ${name}(${params}) -> ${int} {\n  ${}\n}'),
    },
    {
      label: 'if',
      type: 'keyword',
      detail: 'conditional',
      apply: snippet('if ${condition} {\n  ${}\n}'),
    },
    {
      label: 'for',
      type: 'keyword',
      detail: 'loop',
      apply: snippet('for ${item} in ${collection} {\n  ${}\n}'),
    },
    {
      label: 'match',
      type: 'keyword',
      detail: 'pattern match',
      apply: snippet('match ${value} {\n  case ${pattern} -> ${}\n  _ -> ${}\n}'),
    },
    {
      label: 'speak',
      type: 'keyword',
      detail: 'print (v0.3)',
      apply: snippet('speak ${value}'),
    },
  ]

  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/[A-Za-z_]\w*/)
    if (!word || (word.from === word.to && !context.explicit)) return null
    return { from: word.from, options, validFor: /^[A-Za-z_]\w*$/ }
  }
}
