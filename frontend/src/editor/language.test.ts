import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { createCompletions } from './language'

describe('standard-operation completion', () => {
  it('does not advertise removed swap as a builtin', () => {
    const state = EditorState.create({ doc: 'sw' })
    const result = createCompletions('v0.3')(new CompletionContext(state, 2, true))
    expect(result?.options.some((option) => option.label === 'swap')).toBe(false)
    expect(result?.options.some((option) => option.label === 'set')).toBe(true)
  })
})
