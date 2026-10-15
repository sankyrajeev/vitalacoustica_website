import type { RigId } from './content/gear'

// Opening the stage model is a global action: photos, gear lists and capability pages
// can all send visitors into it, and a single overlay in App handles it.

export const STAGE_EVENT = 'va:stage'

export type StageRequest = { mode: 'explore' | 'drone'; focus: RigId | null }

export function openExplore(focus: RigId | null = null) {
  window.dispatchEvent(new CustomEvent<StageRequest>(STAGE_EVENT, { detail: { mode: 'explore', focus } }))
}

export function openDrone() {
  window.dispatchEvent(new CustomEvent<StageRequest>(STAGE_EVENT, { detail: { mode: 'drone', focus: null } }))
}
