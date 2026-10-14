// Shared, render-loop-friendly state for drone mode. The DOM writes input here,
// the 3D rig reads it every frame and writes telemetry back for the HUD.
// Plain mutable objects on purpose: no React re-render per frame.

export const droneInput = {
  keys: new Set<string>(),
  /** virtual joystick, -1..1 (x = strafe right, y = forward) */
  stick: { x: 0, y: 0 },
  /** hold buttons: +1 climb, -1 descend */
  lift: 0,
  /** accumulated look drag in pixels, consumed each frame */
  look: { dx: 0, dy: 0 },
}

export const telemetry = { altitude: 0, speed: 0, heading: 0, x: 0, z: 0 }

export function resetDroneInput() {
  droneInput.keys.clear()
  droneInput.stick.x = droneInput.stick.y = 0
  droneInput.lift = 0
  droneInput.look.dx = droneInput.look.dy = 0
}

const FORWARD = ['w', 'arrowup']
const BACK = ['s', 'arrowdown']
const LEFT = ['a', 'arrowleft']
const RIGHT = ['d', 'arrowright']
const UP = ['e', ' ']
const DOWN = ['q', 'c']

const held = (names: string[]) => (names.some((n) => droneInput.keys.has(n)) ? 1 : 0)

/** Combined control axes from keyboard + touch. */
export function controlAxes() {
  const forward = held(FORWARD) - held(BACK) + droneInput.stick.y
  const strafe = held(RIGHT) - held(LEFT) + droneInput.stick.x
  const lift = held(UP) - held(DOWN) + droneInput.lift
  const fast = droneInput.keys.has('shift')
  return {
    forward: Math.max(-1, Math.min(1, forward)),
    strafe: Math.max(-1, Math.min(1, strafe)),
    lift: Math.max(-1, Math.min(1, lift)),
    fast,
  }
}

export const DRONE_KEYS = new Set([...FORWARD, ...BACK, ...LEFT, ...RIGHT, ...UP, ...DOWN, 'shift'])
