import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import {
  bracketMatching,
  indentOnInput,
} from '@codemirror/language'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands'
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { lintGutter, setDiagnostics } from '@codemirror/lint'
import { Bug, Check, ChevronDown, ChevronUp, Play, Send, Wand2 } from 'lucide-react'
import type { Diagnostic, LangVersion } from '@/lwlang'
import { countBySeverity } from '@/lwlang'
import { formatLwlang } from '@/lib/format'
import { createCompletions, createLwlangLanguage } from './language'
import { lwEditorExtensions } from './theme'
import { DiagnosticList } from '@/components/DiagnosticList'
import { GlowButton } from '@/components/ui'
import { toast } from '@/store/ui'

interface LwEditorProps {
  code: string
  onChange: (code: string) => void
  version: LangVersion
  addonPacks: string[]
  diagnostics: Diagnostic[]
  onRun?: () => void
  onSubmit?: () => void
  running?: boolean
  submitting?: boolean
}

export function LwEditor({
  code,
  onChange,
  version,
  addonPacks,
  diagnostics,
  onRun,
  onSubmit,
  running = false,
  submitting = false,
}: LwEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const codeRef = useRef(code)
  const [showProblems, setShowProblems] = useState(true)

  onChangeRef.current = onChange

  const addonKey = addonPacks.join(',')
  const completions = useMemo(() => createCompletions(version, addonPacks), [version, addonKey])
  const counts = useMemo(() => countBySeverity(diagnostics), [diagnostics])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: codeRef.current,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion({ override: [completions] }),
          highlightActiveLine(),
          highlightSelectionMatches(),
          lintGutter(),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...completionKeymap,
            indentWithTab,
          ]),
          createLwlangLanguage(version, addonPacks),
          ...lwEditorExtensions,
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return
            const next = update.state.doc.toString()
            codeRef.current = next
            onChangeRef.current(next)
          }),
        ],
      }),
    })

    viewRef.current = view
    view.dispatch(setDiagnostics(view.state, []))

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, addonKey])

  useEffect(() => {
    codeRef.current = code
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== code) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: code } })
    }
  }, [code])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const length = view.state.doc.length
    view.dispatch(
      setDiagnostics(
        view.state,
        diagnostics.map((diagnostic) => ({
          from: Math.min(diagnostic.from, length),
          to: Math.min(Math.max(diagnostic.to, diagnostic.from + 1), length),
          severity: diagnostic.severity,
          message: `[${diagnostic.code}] ${diagnostic.message}`,
          source: diagnostic.addonId,
        })),
      ),
    )
  }, [diagnostics])

  const jumpTo = (from: number) => {
    const view = viewRef.current
    if (!view) return
    const pos = Math.min(from, view.state.doc.length)
    view.dispatch({ selection: { anchor: pos }, scrollIntoView: true })
    view.focus()
  }

  const format = () => {
    const view = viewRef.current
    if (!view) return
    const formatted = formatLwlang(view.state.doc.toString())
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: formatted } })
    toast('info', 'Indentation and whitespace formatted.')
  }


  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <span className="editor-dots" aria-hidden="true">
          <span className="editor-dot red" />
          <span className="editor-dot amber" />
          <span className="editor-dot green" />
        </span>
        <span className="badge badge-cyan">{version}</span>
        <span className="spacer" />
        <GlowButton size="sm" onClick={format} icon={<Wand2 size={13} />} title="Format indentation">
          Format
        </GlowButton>
        {onRun && (
          <GlowButton
            size="sm"
            onClick={onRun}
            loading={running}
            icon={<Play size={13} />}
            disabled={submitting}
          >
            Run
          </GlowButton>
        )}
        {onSubmit && (
          <GlowButton
            size="sm"
            variant="primary"
            onClick={onSubmit}
            loading={submitting}
            icon={<Send size={13} />}
            disabled={running}
            title="Submit solution"
          >
            Submit
          </GlowButton>
        )}
      </div>

      <div ref={hostRef} className="editor-area" />

      <div className="editor-statusbar">
        <span className={counts.error > 0 ? 'bad' : 'ok'}>
          <Bug size={11} style={{ verticalAlign: '-1px' }} /> {counts.error} errors
        </span>
        <span className="warn">{counts.warning} warnings</span>
        <span>{counts.info} hints</span>
        <span className="spacer" />
        <span>LWLang {version}</span>
        <span>UTF-8</span>
        <span>shared state</span>
      </div>

      <div className="problems-panel">
        <div className="problems-head">
          <span className="row" style={{ gap: 7 }}>
            {counts.error === 0 ? <Check size={13} color="var(--cyan)" /> : <Bug size={13} color="var(--magenta)" />}
            Problems
          </span>
          <span>
            {counts.error} err · {counts.warning} warn · {counts.info} info
          </span>
          <button onClick={() => setShowProblems((value) => !value)}>
            {showProblems ? (
              <span className="row" style={{ gap: 4 }}>
                hide <ChevronUp size={12} />
              </span>
            ) : (
              <span className="row" style={{ gap: 4 }}>
                show <ChevronDown size={12} />
              </span>
            )}
          </button>
        </div>
        {showProblems && (
          <DiagnosticList
            diagnostics={diagnostics}
            code={code}
            onSelect={(diagnostic) => jumpTo(diagnostic.from)}
          />
        )}
      </div>
    </div>
  )
}
