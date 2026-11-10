import { corePack } from './core'
import { matchPack } from './match'
import { perfPack } from './perf'
import { speakPack } from './speak'
import type { AddonPack } from './types'
import type { LangVersion } from '../version'

export const ADDON_PACKS: Record<string, AddonPack> = {
  core: corePack,
  match: matchPack,
  speak: speakPack,
  perf: perfPack,
}

export const AUTO_PACK_IDS: Record<LangVersion, string[]> = {
  'v0.1': ['core'],
  'v0.2': ['core', 'match'],
  'v0.3': ['core', 'match', 'speak'],
}

export function resolveAddons(version: LangVersion, extraIds: string[] = []): AddonPack[] {
  const ids = Array.from(new Set([...AUTO_PACK_IDS[version], ...extraIds]))
  return ids.map((id) => ADDON_PACKS[id]).filter((pack): pack is AddonPack => Boolean(pack))
}

export function listAddonPacks(): AddonPack[] {
  return Object.values(ADDON_PACKS)
}
