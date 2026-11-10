import type { ApiDiagnostic, RunResult, TestResult, VerdictStatus } from '@/api/types'
import { analyze, isLangVersion, LATEST_VERSION, type LangVersion } from '@/lwlang'
import type { MockTask } from './seed'

interface JudgeOutput {
  status: VerdictStatus
  tests: TestResult[]
  stdout: string
  diagnostics: ApiDiagnostic[]
}

function versionOf(task: MockTask, requested: string): LangVersion {
  if (isLangVersion(requested)) return requested
  return isLangVersion(task.languageVersion) ? task.languageVersion : LATEST_VERSION
}

function stripNoise(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
}

function matchesAll(patterns: string[], code: string): boolean {
  const source = stripNoise(code)
  return patterns.every((pattern) => {
    try {
      return new RegExp(pattern, 'm').test(source)
    } catch {
      return false
    }
  })
}

function toApiDiagnostics(task: MockTask, code: string, version: LangVersion): {
  diagnostics: ApiDiagnostic[]
  parseOk: boolean
} {
  const analysis = analyze(code, version, task.addonPacks)
  return {
    diagnostics: analysis.diagnostics.map((diagnostic) => ({
      severity: diagnostic.severity,
      message: diagnostic.message,
      code: diagnostic.code,
      addonId: diagnostic.addonId,
      from: diagnostic.from,
      to: diagnostic.to,
    })),
    parseOk: analysis.parseOk,
  }
}

export function judge(task: MockTask, code: string, requestedVersion: string): JudgeOutput {
  const version = versionOf(task, requestedVersion)
  const { diagnostics, parseOk } = toApiDiagnostics(task, code, version)

  if (code.trim().length === 0) {
    return {
      status: 'CE',
      tests: [],
      stdout: 'Compilation failed: no code submitted.',
      diagnostics,
    }
  }

  if (!parseOk) {
    return {
      status: 'CE',
      tests: [],
      stdout: 'Compilation failed. Check the problems panel for parser errors.',
      diagnostics,
    }
  }

  const accepted = matchesAll(task.judge.patterns, code)
  const status: VerdictStatus = accepted ? 'OK' : 'WRONG_ANSWER'
  const tests: TestResult[] = task.examples.map((example, index) => ({
    name: `Example ${index + 1}`,
    input: example.input,
    expected: example.output,
    actual: accepted ? example.output : '<wrong answer>',
    passed: accepted,
    durationMs: 8 + Math.round(Math.random() * 40),
  }))
  tests.push({
    name: `Test ${tests.length + 1} (hidden)`,
    input: 'hidden',
    expected: accepted ? 'ok' : 'ok',
    actual: accepted ? 'ok' : '<wrong answer>',
    passed: accepted,
    durationMs: 4 + Math.round(Math.random() * 20),
  })

  return {
    status,
    tests,
    stdout: accepted ? 'All sample tests passed.' : `Wrong answer. Hint: ${task.judge.hint}`,
    diagnostics,
  }
}

export function dryRun(task: MockTask, code: string, requestedVersion: string): RunResult {
  const result = judge(task, code, requestedVersion)
  return {
    status: result.status,
    tests: result.tests.slice(0, task.examples.length),
    stdout: result.stdout,
    diagnostics: result.diagnostics,
  }
}
