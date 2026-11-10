import type { Program } from './ast'
import type { AddonPack } from './addons/types'
import { resolveAddons } from './addons/registry'
import { parse } from './parser'
import type { Diagnostic, RawDiagnostic } from './diagnostics'
import { sortDiagnostics } from './diagnostics'
import type { Token } from './tokenizer'
import { builtinsFor, keywordsFor, type LangVersion } from './version'

export interface EditorAnalysis {
  ast: Program
  tokens: Token[]
  diagnostics: Diagnostic[]
  keywords: string[]
  builtins: string[]
  packs: AddonPack[]
  parseOk: boolean
}

function computeLineStarts(code: string): number[] {
  const starts = [0]
  for (let i = 0; i < code.length; i++) {
    if (code.charCodeAt(i) === 10) starts.push(i + 1)
  }
  return starts
}

function stripAddonId(diagnostic: RawDiagnostic, addonId: string): Diagnostic {
  return { ...diagnostic, addonId }
}

export function analyze(code: string, version: LangVersion, extraPackIds: string[] = []): EditorAnalysis {
  const packs = resolveAddons(version, extraPackIds)
  const { ast, diagnostics: parseDiagnostics, tokens } = parse(code, version)

  const diagnostics: Diagnostic[] = parseDiagnostics.map((diagnostic) =>
    stripAddonId(diagnostic, 'parser'),
  )

  if (code.trim().length > 0) {
    const sourceCtx = {
      code,
      lines: code.split('\n'),
      lineStarts: computeLineStarts(code),
      tokens,
      version,
    }
    const astCtx = { ast, code, tokens, version }
    for (const pack of packs) {
      for (const pass of pack.sourcePasses ?? []) {
        for (const diagnostic of pass(sourceCtx)) {
          diagnostics.push(stripAddonId(diagnostic, pack.id))
        }
      }
      for (const pass of pack.astPasses ?? []) {
        for (const diagnostic of pass(astCtx)) {
          diagnostics.push(stripAddonId(diagnostic, pack.id))
        }
      }
    }
  }

  const keywords = Array.from(
    new Set([...keywordsFor(version), ...packs.flatMap((pack) => pack.keywords)]),
  )

  return {
    ast,
    tokens,
    diagnostics: sortDiagnostics(diagnostics),
    keywords,
    builtins: [...builtinsFor(version)],
    packs,
    parseOk: parseDiagnostics.every((diagnostic) => diagnostic.severity !== 'error'),
  }
}

export * from './version'
export type { Diagnostic, Severity } from './diagnostics'
export { positionAt, countBySeverity, offsetOfLine } from './diagnostics'
export type { AddonPack } from './addons/types'
export { ADDON_PACKS, listAddonPacks } from './addons/registry'
export type { Program } from './ast'
