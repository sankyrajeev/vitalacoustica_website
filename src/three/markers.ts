import type { RigId } from '../content/gear'

// Gear markers in the stage model are plain DOM buttons (rendered by ExploreUi).
// The 3D scene projects each fixture's position to the screen every frame and
// moves the registered element — no nested React roots inside the canvas.
export const markerEls = new Map<RigId, HTMLElement>()

export function registerMarker(id: RigId, el: HTMLElement | null) {
  if (el) markerEls.set(id, el)
  else markerEls.delete(id)
}
