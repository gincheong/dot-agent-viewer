import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

/**
 * Tracks the macOS system appearance and mirrors it into
 * `document.documentElement.dataset.theme`.
 *
 * Resolution order:
 *  1. On mount, if `window.dotAgent.getAppearance()` is available, seed from
 *     the main-process `nativeTheme` (Electron's authoritative source).
 *  2. Subscribe to `onAppearanceChanged` for live updates from main.
 *  3. Fallback: `window.matchMedia('(prefers-color-scheme: dark)')` for jsdom
 *     unit tests and any host where the bridge isn't loaded.
 */
export function useAppearance(): Theme {
  const [theme, setTheme] = useState<Theme>(() => readMatchMedia())

  useEffect(() => {
    const apply = (next: Theme): void => {
      setTheme(next)
      document.documentElement.dataset.theme = next
    }

    // Apply whatever we have from matchMedia first so paint isn't blocked.
    apply(readMatchMedia())

    let unsubscribe: (() => void) | null = null

    // Path 1+2: Electron main-process bridge.
    const bridge =
      typeof window !== 'undefined' ? window.dotAgent : undefined
    if (bridge) {
      void bridge
        .getAppearance()
        .then(({ theme: t }) => apply(t))
        .catch(() => {
          // ignore — fall back to matchMedia listener below
        })
      unsubscribe = bridge.onAppearanceChanged(({ theme: t }) => apply(t))
    }

    // Path 3: matchMedia listener for jsdom / browsers.
    let media: MediaQueryList | null = null
    const onMediaChange = (): void => {
      if (media) apply(media.matches ? 'dark' : 'light')
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      media = window.matchMedia('(prefers-color-scheme: dark)')
      media.addEventListener('change', onMediaChange)
    }

    return () => {
      if (unsubscribe) unsubscribe()
      if (media) media.removeEventListener('change', onMediaChange)
    }
  }, [])

  return theme
}

function readMatchMedia(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}
