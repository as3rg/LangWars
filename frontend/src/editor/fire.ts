import { isolateHistory } from '@codemirror/commands'
import { Transaction, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

type EditableDocument = Pick<EditorView, 'state'> & { dispatch: (spec: TransactionSpec) => void }
type FireEditor = EditableDocument & Pick<EditorView, 'dom' | 'hasFocus'>

export function burnEditorLine(view: EditableDocument): number | undefined {
  const { doc } = view.state
  const candidates = []
  for (let number = 1; number <= doc.lines; number++) {
    const line = doc.line(number)
    if (line.text.trim()) candidates.push(line)
  }
  if (!candidates.length) return
  const line = candidates[Math.floor(Math.random() * candidates.length)]
  const from = line.number === doc.lines && line.number > 1 ? line.from - 1 : line.from
  const to = line.number < doc.lines ? line.to + 1 : line.to
  view.dispatch({
    changes: { from, to, insert: '' },
    annotations: [Transaction.userEvent.of('delete.fire'), isolateHistory.of('full')],
  })
  return line.number
}

/** One focused-editor timer; document edits and locale changes do not reset it. */
export function installEditorFire(view: FireEditor, onBurn: (line: number) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const active = () => view.hasFocus && !document.hidden && document.hasFocus()
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  const schedule = () => {
    if (!active()) { cancel(); return }
    if (timer !== undefined) return
    timer = setTimeout(() => {
      timer = undefined
      if (!active()) return
      const line = burnEditorLine(view)
      if (line !== undefined) onBurn(line)
      schedule()
    }, 30_000 + Math.random() * 60_000)
  }
  view.dom.addEventListener('focusin', schedule)
  view.dom.addEventListener('focusout', cancel)
  document.addEventListener('visibilitychange', schedule)
  window.addEventListener('focus', schedule)
  window.addEventListener('blur', cancel)
  schedule()
  return () => {
    cancel()
    view.dom.removeEventListener('focusin', schedule)
    view.dom.removeEventListener('focusout', cancel)
    document.removeEventListener('visibilitychange', schedule)
    window.removeEventListener('focus', schedule)
    window.removeEventListener('blur', cancel)
  }
}
