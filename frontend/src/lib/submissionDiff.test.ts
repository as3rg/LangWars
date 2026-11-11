import { describe, expect, it } from 'vitest'
import { submissionDiff } from './submissionDiff'

describe('submission diffs', () => {
  it('shows changed lines from the previous API source and numbers both versions', () => {
    expect(submissionDiff('fn answer() {\n  return 1;\n}\n', 'fn answer() {\n  return 2;\n}\n')).toEqual([
      { type: 'ctx', oldLine: 1, newLine: 1, text: 'fn answer() {' },
      { type: 'del', oldLine: 2, text: '  return 1;' },
      { type: 'add', newLine: 2, text: '  return 2;' },
      { type: 'ctx', oldLine: 3, newLine: 3, text: '}' },
    ])
  })
  it('handles empty previous source and missing trailing newlines', () => {
    expect(submissionDiff('', 'let x = 1;')).toEqual([{ type: 'add', newLine: 1, text: 'let x = 1;' }])
    expect(submissionDiff('let x = 1;', '')).toEqual([{ type: 'del', oldLine: 1, text: 'let x = 1;' }])
  })
  it('bounds adversarial edit distances instead of freezing the modal', () => {
    expect(submissionDiff(Array.from({ length: 2100 }, (_, i) => `old${i}\n`).join(''), Array.from({ length: 2100 }, (_, i) => `new${i}\n`).join(''))).toBeUndefined()
  })
})
