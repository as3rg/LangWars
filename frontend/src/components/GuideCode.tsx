import { type ReactNode } from 'react'
import { highlightTree, classHighlighter } from '@lezer/highlight'
import { createLwlangLanguage } from '@/editor/language'

const language = createLwlangLanguage('v0.3')

/** Share the editor tokenizer while keeping examples static and selectable. */
export function GuideCode({ source }: { source: string }) {
  const content: ReactNode[] = []
  let cursor = 0
  highlightTree(language.parser.parse(source), classHighlighter, (from, to, classes) => {
    if (from > cursor) content.push(source.slice(cursor, from))
    content.push(<span className={classes} key={from}>{source.slice(from, to)}</span>)
    cursor = to
  })
  content.push(source.slice(cursor))
  return <pre className="guide-code mono"><code>{content}</code></pre>
}
