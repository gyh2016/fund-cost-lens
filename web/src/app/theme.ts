import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'
export type ColorTheme = ThemeMode

export const THEME_STORAGE_KEY = 'fund-cost-lens-theme'

const THEME_COLORS: Record<ColorTheme, string> = {
  light: '#f3f3f1',
  dark: '#121212',
}

function isColorTheme(value: unknown): value is ColorTheme {
  return value === 'light' || value === 'dark'
}

function storedTheme(): ThemeMode | undefined {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isColorTheme(value) ? value : undefined
  } catch {
    return undefined
  }
}

function systemTheme(): ColorTheme {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function initialTheme(): ThemeMode {
  if (typeof document !== 'undefined') {
    const applied = document.documentElement.dataset.theme
    if (isColorTheme(applied)) return applied
  }
  return preferredTheme()
}

export function preferredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return storedTheme() ?? systemTheme()
}

export function currentTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'light'
  const applied = document.documentElement.dataset.theme
  return isColorTheme(applied) ? applied : preferredTheme()
}

export function applyTheme(
  theme: ThemeMode,
  options: { persist?: boolean } = {},
): void {
  if (typeof document === 'undefined') return

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme

  const themeColor = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  )
  themeColor?.setAttribute('content', THEME_COLORS[theme])

  if (options.persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // The selected theme still applies when storage is unavailable.
    }
  }
}

export function initializeTheme(): ThemeMode {
  const theme = preferredTheme()
  applyTheme(theme)
  return theme
}

export function useTheme(): {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
} {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const initial = initialTheme()
    applyTheme(initial)
    return initial
  })

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    applyTheme(nextTheme, { persist: true })
    setThemeState(nextTheme)
  }, [])

  useEffect(() => {
    if (storedTheme() || typeof window.matchMedia !== 'function') return

    const preference = window.matchMedia('(prefers-color-scheme: dark)')
    if (typeof preference.addEventListener !== 'function') return

    const followSystemTheme = (event: MediaQueryListEvent) => {
      if (storedTheme()) return
      const nextTheme = event.matches ? 'dark' : 'light'
      applyTheme(nextTheme)
      setThemeState(nextTheme)
    }

    preference.addEventListener('change', followSystemTheme)
    return () => preference.removeEventListener('change', followSystemTheme)
  }, [])

  useEffect(() => {
    const syncThemeAcrossTabs = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return
      const nextTheme = isColorTheme(event.newValue)
        ? event.newValue
        : systemTheme()
      applyTheme(nextTheme)
      setThemeState(nextTheme)
    }

    window.addEventListener('storage', syncThemeAcrossTabs)
    return () => window.removeEventListener('storage', syncThemeAcrossTabs)
  }, [])

  return { theme, setTheme }
}
