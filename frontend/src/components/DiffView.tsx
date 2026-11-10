import type { DiffHunk } from '@/api/types'

export function DiffView({ hunks }: { hunks: DiffHunk[] }) {
  if (hunks.length === 0) {
    return <div className="diff-empty">No diff data available.</div>
  }

  return (
    <div className="diff-view">
      {hunks.map((hunk, index) => (
        <div className={`diff-line ${hunk.type}`} key={index}>
          <span className="gutter">
            <span>{hunk.oldLine ?? ''}</span>
            <span>{hunk.newLine ?? ''}</span>
          </span>
          <span className="prefix">{hunk.type === 'add' ? '+' : hunk.type === 'del' ? '-' : ' '}</span>
          <span>{hunk.text || ' '}</span>
        </div>
      ))}
    </div>
  )
}
