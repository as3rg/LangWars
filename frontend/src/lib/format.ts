export function formatLwlang(source: string): string {
  const normalized = source.replace(/\r\n/g, '\n').replace(/\t/g, '  ')
  const rawLines = normalized.split('\n')
  const out: string[] = []
  let depth = 0

  for (const raw of rawLines) {
    const line = raw.replace(/[ \t]+$/, '')
    const trimmed = line.trim()

    if (trimmed.length === 0) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('')
      continue
    }

    const leadingCloses = (trimmed.match(/^}+/) ?? [''])[0].length
    const indent = Math.max(0, depth - leadingCloses)
    out.push('  '.repeat(indent) + trimmed)

    const stripped = trimmed
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      .replace(/\/\/.*$/, '')
      .replace(/\/\*.*?\*\//g, '')
    let delta = 0
    for (const ch of stripped) {
      if (ch === '{') delta += 1
      else if (ch === '}') delta -= 1
    }
    depth = Math.max(0, depth + delta)
  }

  while (out.length > 0 && out[out.length - 1] === '') out.pop()
  return `${out.join('\n')}\n`
}

export function countLines(source: string): number {
  if (source.length === 0) return 1
  return source.split('\n').length
}
