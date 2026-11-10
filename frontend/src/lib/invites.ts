const TOKEN = /^[A-Za-z0-9_-]{1,128}$/

export function inviteFromFragment(fragment: string): string {
  const code = new URLSearchParams(fragment.replace(/^#/, '')).get('invite') ?? ''
  return TOKEN.test(code) ? code : ''
}

export function inviteLink(origin: string, code: string): string {
  if (!TOKEN.test(code)) return ''
  const url = new URL('/auth', origin)
  if (!['http:', 'https:'].includes(url.protocol)) return ''
  // Fragments stay in the browser; the invitation is absent from HTTP request logs.
  url.hash = new URLSearchParams({ invite: code }).toString()
  return url.toString()
}
