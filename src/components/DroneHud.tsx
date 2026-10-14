import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { DRONE_KEYS, droneInput, resetDroneInput, telemetry } from '../three/drone'

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

/** Camera-feed overlay for drone mode: telemetry, controls, touch sticks. */
export function DroneHud({ onExit, touch }: { onExit: () => void; touch: boolean }) {
  const alt = useRef<HTMLSpanElement>(null)
  const spd = useRef<HTMLSpanElement>(null)
  const hdg = useRef<HTMLSpanElement>(null)
  const rec = useRef<HTMLSpanElement>(null)
  const tape = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLSpanElement>(null)

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'escape') return onExit()
      if (DRONE_KEYS.has(k)) {
        e.preventDefault()
        droneInput.keys.add(k)
      }
    }
    const up = (e: KeyboardEvent) => droneInput.keys.delete(e.key.toLowerCase())
    const blur = () => resetDroneInput()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      resetDroneInput()
    }
  }, [onExit])

  // telemetry readout, written straight to the DOM each frame
  useEffect(() => {
    const started = performance.now()
    let raf = 0
    const tick = () => {
      if (alt.current) alt.current.textContent = telemetry.altitude.toFixed(1)
      if (spd.current) spd.current.textContent = telemetry.speed.toFixed(1)
      const h = Math.round(telemetry.heading) % 360
      if (hdg.current) hdg.current.textContent = `${String(h).padStart(3, '0')}° ${COMPASS[Math.round(h / 45) % 8]}`
      if (tape.current) tape.current.style.transform = `translateX(${-(telemetry.heading + 360) * 2}px)`
      if (dot.current) {
        // position on the mini floor plan (room is 28 m wide × 36 m deep)
        dot.current.style.left = `${((telemetry.x + 14) / 28) * 100}%`
        dot.current.style.top = `${((telemetry.z + 6) / 36) * 100}%`
      }
      const s = Math.floor((performance.now() - started) / 1000)
      if (rec.current) rec.current.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="hud" role="region" aria-label="Drone view controls">
      <div className="hud__frame" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="hud__cross" aria-hidden />

      <div className="hud__top">
        <span className="hud__rec">
          <b /> REC <span ref={rec}>00:00</span>
        </span>
        <span className="hud__title">VA-1 · Venue flythrough</span>
        <button className="hud__exit" onClick={onExit}>
          Exit drone view <kbd>Esc</kbd>
        </button>
      </div>

      <div className="hud__compass" aria-hidden>
        <div ref={tape} className="hud__tape">
          {Array.from({ length: 3 }, (_, r) =>
            COMPASS.map((c, i) => (
              <span key={`${r}${c}`} style={{ left: `${(r * 360 + i * 45) * 2}px` }}>
                {c}
              </span>
            )),
          )}
        </div>
      </div>

      <div className="hud__stats">
        <div>
          <small>ALT</small>
          <span ref={alt}>0.0</span>
          <small>m</small>
        </div>
        <div>
          <small>SPD</small>
          <span ref={spd}>0.0</span>
          <small>m/s</small>
        </div>
        <div>
          <small>HDG</small>
          <span ref={hdg}>000°</span>
        </div>
      </div>

      <div className="hud__map" aria-hidden>
        <div className="hud__map-stage" />
        <div className="hud__map-foh" />
        <span ref={dot} className="hud__map-dot" />
      </div>

      {touch ? (
        <TouchControls />
      ) : (
        <p className="hud__help">
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> fly · <kbd>E</kbd>/<kbd>Q</kbd> up/down · <kbd>Shift</kbd> fast · drag to look
        </p>
      )}
    </div>
  )
}

/** Left thumb stick to fly, hold buttons to climb/descend. Look is a drag anywhere else. */
function TouchControls() {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLSpanElement>(null)

  const move = (e: ReactPointerEvent) => {
    const r = base.current!.getBoundingClientRect()
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
    const len = Math.hypot(x, y)
    if (len > 1) {
      x /= len
      y /= len
    }
    droneInput.stick.x = x
    droneInput.stick.y = -y
    knob.current!.style.transform = `translate(${x * 34}px, ${y * 34}px)`
  }
  const end = () => {
    droneInput.stick.x = droneInput.stick.y = 0
    if (knob.current) knob.current.style.transform = ''
  }
  const hold = (v: number) => ({
    onPointerDown: (e: ReactPointerEvent) => {
      e.stopPropagation()
      droneInput.lift = v
    },
    onPointerUp: () => (droneInput.lift = 0),
    onPointerCancel: () => (droneInput.lift = 0),
    onPointerLeave: () => (droneInput.lift = 0),
  })

  return (
    <>
      <div
        ref={base}
        className="hud__stick"
        onPointerDown={(e) => {
          e.stopPropagation()
          e.currentTarget.setPointerCapture(e.pointerId)
          move(e)
        }}
        onPointerMove={(e) => e.buttons && move(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <span ref={knob} />
      </div>
      <div className="hud__lift">
        <button aria-label="Climb" {...hold(1)}>
          ▲
        </button>
        <button aria-label="Descend" {...hold(-1)}>
          ▼
        </button>
      </div>
    </>
  )
}
