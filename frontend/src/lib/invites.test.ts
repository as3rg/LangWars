import { describe, expect, it } from 'vitest'
import { inviteFromFragment, inviteLink } from './invites'

describe('presentation invitations', () => {
  it('builds a same-origin fragment link with no token in the request path or query', () => {
    const value = inviteLink('https://arena.example', 'event_token-123')
    const link = new URL(value)
    expect(link.origin).toBe('https://arena.example')
    expect(link.pathname).toBe('/auth')
    expect(link.search).toBe('')
    expect(link.hash).toBe('#invite=event_token-123')
    expect(inviteFromFragment(link.hash)).toBe('event_token-123')
  })
  it('keeps a local preview port and rejects malformed tokens', () => {
    expect(inviteLink('http://localhost:8080', 'new_token')).toBe('http://localhost:8080/auth#invite=new_token')
    expect(inviteFromFragment('#invite=%3Cscript%3E')).toBe('')
    expect(inviteFromFragment('#invite=' + 'x'.repeat(129))).toBe('')
    expect(inviteLink('https://arena.example', 'space token')).toBe('')
    expect(inviteFromFragment('#unrelated=hello')).toBe('')
  })
})
