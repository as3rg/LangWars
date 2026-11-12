import { EditorState, type TransactionSpec } from '@codemirror/state'
import { history, undo } from '@codemirror/commands'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { burnEditorLine, installEditorFire } from './fire'

function editor(code: string) {
  let state = EditorState.create({ doc: code, selection: { anchor: code.length }, extensions: [history()] })
  const drafts: string[] = []
  return {
    dom: new EventTarget() as unknown as HTMLElement,
    hasFocus: true,
    get state() { return state },
    dispatch(spec: TransactionSpec | ReturnType<EditorState['update']>) {
      const transaction = 'state' in spec ? spec : state.update(spec)
      state = transaction.state
      if (transaction.docChanged) drafts.push(state.doc.toString())
    },
    drafts,
  }
}

let page: EventTarget & { hidden: boolean; hasFocus: () => boolean }
let viewport: EventTarget
let cleanup: (() => void) | undefined

beforeEach(() => {
  vi.useFakeTimers()
  page = Object.assign(new EventTarget(), { hidden: false, hasFocus: () => true })
  viewport = new EventTarget()
  vi.stubGlobal('document', page)
  vi.stubGlobal('window', viewport)
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  cleanup?.()
  cleanup = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('editor fire', () => {
  it.each([
    ['first\nsecond\nthird', 0, 'second\nthird'],
    ['first\nsecond\nthird', 0.5, 'first\nthird'],
    ['first\nsecond\nthird', 0.99, 'first\nsecond'],
    ['only line', 0, ''],
    ['\n  \ncode\n', 0, '\n  \n'],
  ])('removes one complete nonempty physical line from %j', (source, random, expected) => {
    vi.mocked(Math.random).mockReturnValue(random)
    const view = editor(source)
    const line = burnEditorLine(view)
    expect(line).toBeDefined()
    expect(view.state.doc.toString()).toBe(expected)
    expect(view.state.selection.main.head).toBe(expected.length)
    expect(view.drafts).toEqual([expected])
    expect(undo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe(source)
  })

  it('keeps fire in its own undo step and preserves the source already sent for judging', () => {
    const view = editor('first\nsecond')
    view.dispatch({ changes: { from: view.state.doc.length, insert: '\nthird' } })
    const submittedSource = view.state.doc.toString()
    burnEditorLine(view)
    expect(view.drafts.at(-1)).toBe('second\nthird')
    expect(submittedSource).toBe('first\nsecond\nthird')
    expect(undo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe(submittedSource)
    expect(undo(view)).toBe(true)
    expect(view.state.doc.toString()).toBe('first\nsecond')
  })

  it('does nothing to an empty draft', () => {
    const view = editor('\n  \n')
    expect(burnEditorLine(view)).toBeUndefined()
    expect(view.drafts).toEqual([])
  })

  it('burns repeatedly after random delays, using the latest editor contents without restarting on edits', () => {
    const view = editor('first\nsecond\nthird')
    const onBurn = vi.fn()
    cleanup = installEditorFire(view, onBurn)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(20_000)
    view.dispatch({ changes: { from: 0, insert: 'new\n' } })
    vi.advanceTimersByTime(9_999)
    expect(onBurn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(view.state.doc.toString()).toBe('first\nsecond\nthird')
    expect(onBurn).toHaveBeenLastCalledWith(1)
    vi.advanceTimersByTime(30_000)
    expect(view.state.doc.toString()).toBe('second\nthird')
    expect(onBurn).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('pauses on blur/background and cancels all work/listeners when disabled or unmounted', () => {
    const view = editor('first\nsecond\nthird')
    const onBurn = vi.fn()
    cleanup = installEditorFire(view, onBurn)
    view.hasFocus = false
    view.dom.dispatchEvent(new Event('focusout'))
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(90_000)
    expect(onBurn).not.toHaveBeenCalled()
    view.hasFocus = true
    view.dom.dispatchEvent(new Event('focusin'))
    expect(vi.getTimerCount()).toBe(1)
    page.hidden = true
    page.dispatchEvent(new Event('visibilitychange'))
    expect(vi.getTimerCount()).toBe(0)
    page.hidden = false
    page.dispatchEvent(new Event('visibilitychange'))
    viewport.dispatchEvent(new Event('focus'))
    expect(vi.getTimerCount()).toBe(1)
    cleanup()
    expect(vi.getTimerCount()).toBe(0)
    view.dom.dispatchEvent(new Event('focusin'))
    page.dispatchEvent(new Event('visibilitychange'))
    viewport.dispatchEvent(new Event('focus'))
    vi.advanceTimersByTime(90_000)
    expect(onBurn).not.toHaveBeenCalled()
  })

  it('waits for focus before scheduling, and uses the full delay range', () => {
    vi.mocked(Math.random).mockReturnValue(0.5)
    const view = editor('first\nsecond')
    view.hasFocus = false
    const onBurn = vi.fn()
    cleanup = installEditorFire(view, onBurn)
    expect(vi.getTimerCount()).toBe(0)
    view.hasFocus = true
    view.dom.dispatchEvent(new Event('focusin'))
    vi.advanceTimersByTime(59_999)
    expect(onBurn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onBurn).toHaveBeenCalledWith(2)
    expect(view.state.doc.toString()).toBe('first')
  })
})
