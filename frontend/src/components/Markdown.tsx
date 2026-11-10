import type { ReactNode } from 'react'

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0
  let match: RegExpExecArray | null
  let index = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${keyPrefix}-i${index++}`
    if (token.startsWith('`')) {
      nodes.push(
        <code className="inline" key={key}>
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    }
    last = match.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

const BLOCK_START = /^(#{2,4}\s|[-*]\s|>\s|```)/

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i += 1
      continue
    }

    if (/^```/.test(line)) {
      const code: string[] = []
      i += 1
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i])
        i += 1
      }
      i += 1
      blocks.push(
        <pre key={`b${key++}`}>
          <code>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const heading = /^(#{2,4})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const content = renderInline(heading[2], `h${key}`)
      blocks.push(level === 2 ? <h3 key={`b${key++}`}>{content}</h3> : <h4 key={`b${key++}`}>{content}</h4>)
      i += 1
      continue
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''))
        i += 1
      }
      blocks.push(
        <ul key={`b${key++}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `li${key}-${itemIndex}`)}</li>
          ))}
        </ul>,
      )
      continue
    }

    if (/^>\s/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i += 1
      }
      blocks.push(
        <blockquote key={`b${key++}`}>{renderInline(quote.join(' '), `q${key}`)}</blockquote>,
      )
      continue
    }

    const paragraph: string[] = [line]
    i += 1
    while (i < lines.length && lines[i].trim() !== '' && !BLOCK_START.test(lines[i])) {
      paragraph.push(lines[i])
      i += 1
    }
    blocks.push(<p key={`b${key++}`}>{renderInline(paragraph.join(' '), `p${key}`)}</p>)
  }

  return <div className={className ? `md ${className}` : 'md'}>{blocks}</div>
}
