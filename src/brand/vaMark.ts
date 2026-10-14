import { Shape, Vector2 } from 'three'

// The VA monogram traced from the brand logo (public/brand/va-mark-*.png).
// Coordinates are in pixels, y pointing down, origin at the mark's top-left.
export const VA_MARK_SIZE = { width: 1485, height: 806 }

export const VA_MARK_POLYGONS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  // V
  [[1, 6], [439, 804], [519, 804], [958, 5], [769, 5], [479, 532], [190, 6]],
  // A — left leg
  [[1046, 2], [1037, 1], [1033, 4], [607, 786], [604, 799], [609, 804], [778, 804], [814, 742], [1130, 161], [1129, 152]],
  // A — right leg, split into stripes
  [[1144, 180], [1043, 365], [1062, 400], [1163, 215]],
  [[1175, 237], [1074, 422], [1097, 464], [1198, 280]],
  [[1211, 303], [1110, 486], [1141, 545], [1242, 360]],
  [[1254, 383], [1154, 566], [1190, 635], [1291, 451]],
  [[1303, 473], [1203, 657], [1244, 735], [1345, 552]],
  [[1358, 573], [1257, 758], [1282, 804], [1483, 804]],
]

/** Three.js shapes for the mark, centred on the origin with y pointing up. */
export function vaMarkShapes(): Shape[] {
  const cx = VA_MARK_SIZE.width / 2
  const cy = VA_MARK_SIZE.height / 2
  return VA_MARK_POLYGONS.map(
    (poly) => new Shape(poly.map(([x, y]) => new Vector2(x - cx, cy - y))),
  )
}
