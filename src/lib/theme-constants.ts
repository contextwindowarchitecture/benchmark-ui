/** The local storage key the inline script in index.html and the ThemeProvider share. */
export const THEME_STORAGE_KEY = "benchmark-ui.theme"

export const THEMES = ["light", "dark", "system"] as const
export type Theme = (typeof THEMES)[number]
