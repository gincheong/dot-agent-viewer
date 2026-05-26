import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

/**
 * Mirrors `prefers-color-scheme` into `document.documentElement.dataset.theme`
 * and returns the current theme so callers can render conditionally.
 *
 * Phase E will additionally wire the main-process `system:appearance` IPC for
 * cases where Electron's nativeTheme overrides matchMedia.
 */
export function useAppearance(): Theme {
  const [theme, setTheme] = useState<Theme>(() => readTheme())

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      const next: Theme = media.matches ? 'dark' : 'light'
      setTheme(next)
      document.documentElement.dataset.theme = next
    }

    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  return theme
}

function readTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}
