export function formatLwlang(source: string): string {
  const normalized = source.replace(/\r\n/g, '\n')
  const rawLines = normalized.split('\n')
  const out: string[] = []
  let depth = 0
  let inBlockComment = false
  let inString = false
  let escaped = false

  for (const raw of rawLines) {
    const startsInsideString = inString
    const startsInsideComment = inBlockComment
    let delta = 0
    for (let index = 0; index < raw.length; index++) {
      const char = raw[index]
      const next = raw[index + 1]
      if (inBlockComment) {
        if (char === '*' && next === '/') { inBlockComment = false; index++ }
        continue
      }
      if (inString) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') inString = false
        continue
      }
      if (char === '/' && next === '/') break
      if (char === '/' && next === '*') { inBlockComment = true; index++; continue }
      if (char === '"') { inString = true; continue }
      if (char === '{') delta++
      if (char === '}') delta--
    }
    if (startsInsideString) { out.push(raw); depth = Math.max(0, depth + delta); continue }
    const line = inString ? raw : raw.replace(/[ \t]+$/, '')
    const trimmed = inString ? line.trimStart() : line.trim()

    if (trimmed.length === 0) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('')
      continue
    }

    const leadingCloses = startsInsideComment ? 0 : (trimmed.match(/^}+/) ?? [''])[0].length
    const indent = Math.max(0, depth - leadingCloses)
    out.push('  '.repeat(indent) + trimmed)

    depth = Math.max(0, depth + delta)
  }

  while (out.length > 0 && out[out.length - 1] === '') out.pop()
  return `${out.join('\n')}\n`
}

export function countLines(source: string): number {
  if (source.length === 0) return 1
  return source.split('\n').length
}
