import type { GearId } from './content/gear'

/** Ask the hero to open explore mode, optionally focused on a piece of gear. */
export const EXPLORE_EVENT = 'va:explore'

export function openExplore(id: GearId | null) {
  window.dispatchEvent(new CustomEvent<GearId | null>(EXPLORE_EVENT, { detail: id }))
}
