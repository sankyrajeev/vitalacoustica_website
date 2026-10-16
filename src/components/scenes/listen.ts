import { fract } from './kit'

/* ─────────────── listening: a made-up track, or the microphone ─────────────── */

export const BPM = 124

export type Mic = { an: AnalyserNode; freq: Uint8Array<ArrayBuffer>; stream: MediaStream; ac: AudioContext }
export type Heard = {
  bass: number
  mids: number
  highs: number
  level: number
  hit: boolean // a transient this frame
  beats: number
  bar: number
  section: string
}

export function makeListener() {
  const s: Heard = { bass: 0, mids: 0, highs: 0, level: 0, hit: false, beats: 0, bar: 0, section: 'Intro' }
  let last = -1
  let avg = 0.1
  let lastHit = -1
  return (t: number, mic: Mic | null): Heard => {
    let bass: number
    let mids: number
    let highs: number
    s.hit = false
    if (mic) {
      mic.an.getByteFrequencyData(mic.freq)
      const hz = mic.ac.sampleRate / mic.an.fftSize
      const band = (lo: number, hi: number) => {
        let sum = 0
        let n = 0
        for (let i = Math.max(1, Math.floor(lo / hz)); i <= Math.min(mic.freq.length - 1, Math.ceil(hi / hz)); i++) {
          sum += mic.freq[i]
          n++
        }
        return n ? sum / n / 255 : 0
      }
      bass = band(30, 160)
      mids = band(300, 2500)
      highs = Math.min(1, band(5000, 14000) * 1.6)
      avg += (bass - avg) * 0.04
      if (bass > avg * 1.2 && bass > 0.3 && t - lastHit > 0.28) {
        s.hit = true
        lastHit = t
        s.beats++
      }
      s.bar = Math.floor(s.beats / 4)
      s.section = 'Listening'
    } else {
      // 32 bars of intro, build, drop and breakdown, looping
      const beatF = (t * BPM) / 60
      const b = Math.floor(beatF)
      const ph = beatF - b
      const bar = Math.floor(b / 4) % 32
      const build = bar < 8 ? 0.3 : bar < 16 ? 0.3 + ((bar - 8 + (b % 4) / 4) / 8) * 0.6 : bar < 28 ? 1 : 0.2
      const kickOn = bar < 28
      bass = kickOn ? Math.exp(-ph * 6) * (bar < 16 ? 0.75 : 1) : 0.05
      highs = bar >= 8 && bar < 28 ? build * (0.3 + 0.6 * Math.exp(-fract(ph + 0.5) * 9)) : 0.06
      mids = 0.2 + 0.55 * build * (0.7 + 0.3 * Math.sin(t * 1.7))
      if (b !== last) {
        last = b
        if (kickOn) {
          s.hit = true
          s.beats = b
        }
      }
      s.bar = bar
      s.section = bar < 8 ? 'Intro' : bar < 16 ? 'Build' : bar < 28 ? 'Drop' : 'Breakdown'
    }
    s.bass += (bass - s.bass) * 0.4
    s.mids += (mids - s.mids) * 0.15
    s.highs += (highs - s.highs) * 0.3
    s.level += (Math.min(1, (bass + mids + highs) / 1.8) - s.level) * 0.05
    return s
  }
}
