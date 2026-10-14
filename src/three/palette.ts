import { createContext, useContext } from 'react'

export type SceneTheme = 'dark' | 'light'

export type ScenePalette = {
  theme: SceneTheme
  background: string
  fogNear: number
  fogFar: number
  ambient: number
  hemi: number
  floor: string
  wall: string
  steel: string
  crowd: string
  /** additive beams vanish on a light background, so they switch to normal blending */
  beamAdditive: boolean
  beamOpacity: number
  bloomThreshold: number
  bloomIntensity: number
}

export const PALETTES: Record<SceneTheme, ScenePalette> = {
  dark: {
    theme: 'dark',
    background: '#030303',
    fogNear: 16,
    fogFar: 46,
    ambient: 0.1,
    hemi: 0.22,
    floor: '#0a0a0a',
    wall: '#1a1918',
    steel: '#1a1a1a',
    crowd: '#060606',
    beamAdditive: true,
    beamOpacity: 1,
    bloomThreshold: 0.2,
    bloomIntensity: 1.05,
  },
  light: {
    theme: 'light',
    background: '#e7e5e0',
    fogNear: 18,
    fogFar: 60,
    ambient: 0.55,
    hemi: 1.1,
    floor: '#b9b6b0',
    wall: '#d9d6d0',
    steel: '#6d6d6d',
    crowd: '#1c1c1c',
    beamAdditive: false,
    beamOpacity: 0.55,
    bloomThreshold: 0.92,
    bloomIntensity: 0.6,
  },
}

export const PaletteContext = createContext<ScenePalette>(PALETTES.dark)
export const usePalette = () => useContext(PaletteContext)
