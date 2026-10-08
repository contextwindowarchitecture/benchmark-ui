import { createContext, useContext } from "react"

import type { Theme } from "./theme-constants"

export type ThemeContextValue = {
  theme: Theme
  /** What is on screen once `system` is resolved. */
  resolved: "light" | "dark"
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme needs a ThemeProvider")
  return context
}
