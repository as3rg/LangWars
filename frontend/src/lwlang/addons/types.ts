import type { Program } from '../ast'
import type { RawDiagnostic } from '../diagnostics'
import type { Token } from '../tokenizer'
import type { LangVersion } from '../version'

export interface SourceContext {
  code: string
  lines: string[]
  lineStarts: number[]
  tokens: Token[]
  version: LangVersion
}

export interface AstContext {
  ast: Program
  code: string
  tokens: Token[]
  version: LangVersion
}

export type SourcePass = (ctx: SourceContext) => RawDiagnostic[]
export type AstPass = (ctx: AstContext) => RawDiagnostic[]

export interface AddonPack {
  id: string
  title: string
  description: string
  kind: 'language' | 'task'
  keywords: string[]
  sourcePasses?: SourcePass[]
  astPasses?: AstPass[]
}
