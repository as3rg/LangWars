export const LANG_VERSIONS = ['v0.1', 'v0.2', 'v0.3'] as const
export type LangVersion = (typeof LANG_VERSIONS)[number]

export const LATEST_VERSION: LangVersion = 'v0.3'

const CORE_KEYWORDS = [
  'fn',
  'let',
  'mut',
  'if',
  'elif',
  'else',
  'while',
  'for',
  'in',
  'return',
  'true',
  'false',
  'and',
  'or',
  'not',
  'int',
  'float',
  'bool',
  'str',
  'arr',
  'void',
] as const

const V2_KEYWORDS = ['match', 'case', 'cat'] as const
const V3_KEYWORDS = ['speak'] as const

export const KEYWORDS_BY_VERSION: Record<LangVersion, readonly string[]> = {
  'v0.1': [...CORE_KEYWORDS],
  'v0.2': [...CORE_KEYWORDS, ...V2_KEYWORDS],
  'v0.3': [...CORE_KEYWORDS, ...V2_KEYWORDS, ...V3_KEYWORDS],
}

export const ALL_KEYWORDS = new Set<string>(KEYWORDS_BY_VERSION['v0.3'])

export const BUILTINS_BY_VERSION: Record<LangVersion, readonly string[]> = {
  'v0.1': ['print'],
  'v0.2': ['print'],
  'v0.3': ['print', 'len', 'push'],
}

export const TYPE_NAMES = new Set(['int', 'float', 'bool', 'str', 'arr', 'void'])

export function isLangVersion(value: string): value is LangVersion {
  return (LANG_VERSIONS as readonly string[]).includes(value)
}

export function versionRank(version: LangVersion): number {
  return LANG_VERSIONS.indexOf(version)
}

export function keywordsFor(version: LangVersion): readonly string[] {
  return KEYWORDS_BY_VERSION[version]
}

export function builtinsFor(version: LangVersion): readonly string[] {
  return BUILTINS_BY_VERSION[version]
}

export function isKeyword(word: string): boolean {
  return ALL_KEYWORDS.has(word)
}
