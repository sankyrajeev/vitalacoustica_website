import { useEffect, useMemo, useRef, useState } from 'react'
import type { AudioPack } from '../../content/shop'

// A preview player for audio packs. Plays the pack's real preview file when it has one;
// until then it plays a short demo synthesised in the browser in the pack's style.
// Only one preview plays at a time.

const LENGTH = 8 // seconds of demo

type Player = { stop: () => void; progress: () => number }
let playing: { id: string; player: Player; onStop: () => void } | null = null

function stopAll() {
  if (!playing) return
  playing.player.stop()
  playing.onStop()
  playing = null
}

let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

/** The demo in the pack's style, made from oscillators and noise. */
function synth(style: AudioPack['sound']): Player {
  ctx ??= new AudioContext()
  const ac = ctx
  void ac.resume()
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t0 = ac.currentTime + 0.05
  const out = ac.createGain()
  const limiter = ac.createDynamicsCompressor()
  out.gain.setValueAtTime(0.55, t0)
  out.gain.setValueAtTime(0.55, t0 + LENGTH - 0.6)
  out.gain.linearRampToValueAtTime(0.0001, t0 + LENGTH)
  out.connect(limiter).connect(ac.destination)
  const nodes: AudioScheduledSourceNode[] = []

  const env = (g: GainNode, t: number, peak: number, decay: number) => {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  }
  const kick = (t: number, from = 150, to = 45, decay = 0.45) => {
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.frequency.setValueAtTime(from, t)
    o.frequency.exponentialRampToValueAtTime(to, t + 0.12)
    env(g, t, 1, decay)
    o.connect(g).connect(out)
    o.start(t)
    o.stop(t + decay + 0.05)
    nodes.push(o)
  }
  const tone = (t: number, f: number, type: OscillatorType, peak: number, decay: number, cutoff = 20000) => {
    const o = ac.createOscillator()
    const lp = ac.createBiquadFilter()
    const g = ac.createGain()
    o.type = type
    o.frequency.value = f
    lp.frequency.value = cutoff
    env(g, t, peak, decay)
    o.connect(lp).connect(g).connect(out)
    o.start(t)
    o.stop(t + decay + 0.05)
    nodes.push(o)
  }
  const hiss = (t: number, type: BiquadFilterType, f: number, peak: number, decay: number) => {
    const s = ac.createBufferSource()
    const flt = ac.createBiquadFilter()
    const g = ac.createGain()
    s.buffer = noise
    s.loop = true
    flt.type = type
    flt.frequency.value = f
    env(g, t, peak, decay)
    s.connect(flt).connect(g).connect(out)
    s.start(t, Math.random() * 0.5)
    s.stop(t + decay + 0.05)
    nodes.push(s)
  }

  if (style === 'kicks' || style === 'techno') {
    const beat = 60 / (style === 'kicks' ? 124 : 130)
    for (let b = 0; b * beat < LENGTH - 0.3; b++) {
      const t = t0 + b * beat
      if (style === 'kicks') {
        const v = b % 4
        kick(t, [150, 120, 180, 110][v], [45, 40, 50, 36][v], v === 3 ? 0.9 : 0.5)
        if (v === 3) tone(t, 41.2, 'sine', 0.5, 1.2)
      } else {
        kick(t, 140, 42, 0.35)
        hiss(t + beat / 2, 'highpass', 8000, 0.25, 0.06)
        hiss(t + beat / 4, 'highpass', 9000, 0.06, 0.03)
        hiss(t + (beat * 3) / 4, 'highpass', 9000, 0.08, 0.03)
        if (b % 2 === 1) hiss(t, 'bandpass', 1600, 0.4, 0.18)
        for (let s = 1; s < 4; s++) tone(t + (s * beat) / 4, [55, 55, 65.4][s - 1], 'sawtooth', 0.22, 0.14, 380)
      }
    }
  } else if (style === 'ambient') {
    for (const [f, d] of [
      [110, 0],
      [164.8, 3],
      [220, -4],
      [261.6, 5],
      [329.6, -2],
    ]) {
      const o = ac.createOscillator()
      const lp = ac.createBiquadFilter()
      const g = ac.createGain()
      o.type = 'sawtooth'
      o.frequency.value = f
      o.detune.value = d
      lp.frequency.setValueAtTime(300, t0)
      lp.frequency.linearRampToValueAtTime(1400, t0 + LENGTH / 2)
      lp.frequency.linearRampToValueAtTime(400, t0 + LENGTH)
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(0.06, t0 + 2.5)
      g.gain.linearRampToValueAtTime(0.0001, t0 + LENGTH)
      o.connect(lp).connect(g).connect(out)
      o.start(t0)
      o.stop(t0 + LENGTH)
      nodes.push(o)
    }
    hiss(t0, 'bandpass', 900, 0.08, LENGTH)
  } else {
    // a riser into an impact, then a downlifter
    const s = ac.createBufferSource()
    const bp = ac.createBiquadFilter()
    const g = ac.createGain()
    s.buffer = noise
    s.loop = true
    bp.type = 'bandpass'
    bp.Q.value = 4
    bp.frequency.setValueAtTime(300, t0)
    bp.frequency.exponentialRampToValueAtTime(9000, t0 + 3.6)
    bp.frequency.exponentialRampToValueAtTime(200, t0 + 7.5)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.7, t0 + 3.6)
    g.gain.setValueAtTime(0.0001, t0 + 3.62)
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 4.8)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 7.6)
    s.connect(bp).connect(g).connect(out)
    s.start(t0)
    s.stop(t0 + LENGTH)
    nodes.push(s)
    kick(t0 + 3.65, 120, 30, 2.2)
    hiss(t0 + 3.65, 'lowpass', 3000, 0.6, 1.8)
  }

  return {
    stop: () => {
      out.gain.cancelScheduledValues(ac.currentTime)
      out.gain.setTargetAtTime(0, ac.currentTime, 0.03)
      window.setTimeout(() => {
        nodes.forEach((n) => {
          try {
            n.stop()
          } catch {
            /* already stopped */
          }
        })
        out.disconnect()
      }, 150)
    },
    progress: () => Math.max(0, (ac.currentTime - t0) / LENGTH),
  }
}

function file(src: string): Player {
  const a = new Audio(`${import.meta.env.BASE_URL}${src}`)
  void a.play()
  return {
    stop: () => a.pause(),
    progress: () => (a.duration ? a.currentTime / a.duration : 0),
  }
}

export function AudioPreview({ p, compact }: { p: AudioPack; compact?: boolean }) {
  const [on, setOn] = useState(false)
  const bar = useRef<HTMLDivElement>(null)
  // a fixed, made-up waveform per pack
  const peaks = useMemo(() => {
    const seed = p.id.length * 7.31
    return Array.from({ length: compact ? 32 : 56 }, (_, i) => {
      const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453
      const r = x - Math.floor(x)
      const shape =
        p.sound === 'fx' ? Math.pow(i / 56, 1.5) : p.sound === 'ambient' ? 0.5 + 0.3 * Math.sin(i / 7) : i % 4 === 0 ? 1 : 0.45
      return Math.max(0.12, Math.min(1, shape * (0.6 + r * 0.5)))
    })
  }, [p.id, p.sound, compact])

  useEffect(
    () => () => {
      if (playing?.id === p.id) stopAll()
    },
    [p.id],
  )

  useEffect(() => {
    if (!on) {
      bar.current?.style.setProperty('--progress', '0')
      return
    }
    let raf = 0
    const tick = () => {
      const k = playing?.id === p.id ? playing.player.progress() : 1
      bar.current?.style.setProperty('--progress', String(Math.min(1, k)))
      if (k >= 1) {
        stopAll()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [on, p.id])

  const toggle = () => {
    if (on) return stopAll()
    stopAll()
    playing = {
      id: p.id,
      player: p.preview ? file(p.preview) : synth(p.sound),
      onStop: () => setOn(false),
    }
    setOn(true)
  }

  return (
    <div className={`player ${compact ? 'player--compact' : ''} ${on ? 'is-on' : ''}`}>
      <button
        className="player__btn"
        onClick={toggle}
        aria-label={on ? `Stop the ${p.name} preview` : `Play a preview of ${p.name}`}
        aria-pressed={on}
      >
        {on ? (
          <svg viewBox="0 0 16 16" aria-hidden>
            <rect x="4" y="3" width="3" height="10" />
            <rect x="9" y="3" width="3" height="10" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden>
            <path d="M5 3l8 5-8 5z" />
          </svg>
        )}
      </button>
      <div ref={bar} className="player__wave" aria-hidden>
        {peaks.map((v, i) => (
          <span
            key={i}
            style={{
              height: `${v * 100}%`,
              ['--at' as string]: i / peaks.length,
            }}
          />
        ))}
      </div>
    </div>
  )
}
