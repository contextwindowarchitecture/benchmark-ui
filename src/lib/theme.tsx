// The theme owner (DESIGN.md 6.1, 11): light, dark or system, persisted in local storage under
// the key the inline script in index.html reads before first paint. One owner, one class on
// <html>, no flash.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { ThemeContext, type ThemeContextValue } from "./theme-context"
import { THEME_STORAGE_KEY, type Theme } from "./theme-constants"

function readStored(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === "light" || stored === "dark" ? stored : "system"
  } catch {
    return "system"
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
}

function apply(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark)
  document.documentElement.style.colorScheme = dark ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStored)
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark)

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  const resolved: "light" | "dark" = theme === "system" ? (systemDark ? "dark" : "light") : theme

  useEffect(() => {
    apply(resolved === "dark")
  }, [resolved])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* no storage: the choice lasts for the page */
    }
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
