import type { Theme } from '../hooks/useTheme'

/** Logo file for the current theme: white on dark, black on light. */
export const logoSrc = (name: 'logo-full' | 'va-mark', theme: Theme) =>
  `${import.meta.env.BASE_URL}brand/${name}-${theme === 'dark' ? 'white' : 'black'}.png`
