import { describe, expect, it } from 'vitest'
import type { Namespace } from '@/api/types'
import { visibleWorldEntries } from './world'

const world: Namespace = {
  version: 1,
  values: { answer: 42 },
  functions: { solve: { source: 'secret solution', params: ['secret'] } },
  last: { solve: 42 },
  visibility: { variables: { names: true, values: false }, functions: { names: false, values: true } },
}

describe('world visibility', () => {
  it('does not reveal values or signatures in a names-only view even if the payload contains them', () => {
    expect(visibleWorldEntries(world, 'values')).toEqual([['answer', null]])
    expect(visibleWorldEntries({ ...world, visibility: { ...world.visibility, functions: { names: true, values: false } } }, 'functions')).toEqual([['solve', null]])
  })
  it('hides entries completely when their names are private', () => {
    expect(visibleWorldEntries(world, 'functions')).toEqual([])
    expect(visibleWorldEntries(undefined, 'functions')).toEqual([])
  })
  it('retains full definitions for an explicitly authorized view', () => {
    expect(visibleWorldEntries({ ...world, visibility: { variables: { names: true, values: true }, functions: { names: true, values: true } } }, 'functions')).toEqual([['solve', world.functions.solve]])
  })
})
