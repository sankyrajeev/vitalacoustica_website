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
    background: '#101010',
    fogNear: 16,
    fogFar: 46,
    ambient: 0.14,
    hemi: 0.28,
    floor: '#121212',
    wall: '#1c1c1b',
    steel: '#232322',
    crowd: '#101010',
    beamAdditive: true,
    beamOpacity: 1,
    bloomThreshold: 0.2,
    bloomIntensity: 1.05,
  },
  light: {
    theme: 'light',
    background: '#f0ede5',
    fogNear: 18,
    fogFar: 60,
    ambient: 0.55,
    hemi: 1.1,
    floor: '#c9c5bb',
    wall: '#e4e0d6',
    steel: '#6e6a62',
    crowd: '#1c1c1b',
    beamAdditive: false,
    beamOpacity: 0.55,
    bloomThreshold: 0.92,
    bloomIntensity: 0.6,
  },
}

export const PaletteContext = createContext<ScenePalette>(PALETTES.dark)
export const usePalette = () => useContext(PaletteContext)
