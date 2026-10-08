// Applies the stored theme before first paint, so there is no flash (DESIGN.md 11). Loaded
// synchronously from index.html's <head>, as a file rather than inline, because the deployed
// Content Security Policy is `script-src 'self'`. The ThemeProvider in src/lib/theme.tsx owns the
// same key (THEME_STORAGE_KEY in src/lib/theme-constants.ts) and the class afterwards.
;(function () {
  try {
    var stored = localStorage.getItem("benchmark-ui.theme")
    var dark =
      stored === "dark" ||
      ((stored === null || stored === "system") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList.toggle("dark", dark)
    document.documentElement.style.colorScheme = dark ? "dark" : "light"
  } catch {
    /* no storage: the system theme applies */
  }
})()
