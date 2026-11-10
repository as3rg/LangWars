import type { Namespace } from '@/api/types'

export function visibleWorldEntries(world: Namespace | undefined, kind: 'values' | 'functions'): [string, unknown][] {
  const visibility = world?.visibility?.[kind === 'values' ? 'variables' : 'functions']
  if (!world || !visibility?.names) return []
  return Object.entries(world[kind]).map(([name, value]) => [name, visibility.values ? value : null])
}
