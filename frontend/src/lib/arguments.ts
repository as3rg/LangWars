import { t } from './i18n'

export function formatArguments(input: string, source: string): string {
  let values: unknown
  try { values = JSON.parse(input) } catch { return input }
  if (!Array.isArray(values)) return input
  if (!values.length) return t('No arguments')

  // Comments and string literals must not masquerade as a function signature.
  const declarations = source.replace(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ' ')
  const match = declarations.match(/@\s*solution\s+fn\b\s*(?:<[^>]*>\s*)?[A-Za-z_]+\s*\(([^)]*)\)/)
  const names = match?.[1].split(',').map((name) => name.trim()).filter(Boolean) ?? []
  return values.map((value, index) => `${names[index] ?? t('Argument {number}', { number: index + 1 })} = ${JSON.stringify(value)}`).join('\n')
}
