// Gear markers in the stage model are plain DOM buttons (rendered by ExploreUi), one per fixture.
// The 3D scene projects each fixture's position to the screen every frame and
// moves the registered element — no nested React roots inside the canvas.
export const markerEls = new Map<string, HTMLElement>()

export function registerMarker(key: string, el: HTMLElement | null) {
  if (el) markerEls.set(key, el)
  else markerEls.delete(key)
}
