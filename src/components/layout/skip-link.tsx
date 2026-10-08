/** The first focusable element: jumps past the navigation to the page (DESIGN.md 10). */
export function SkipLink() {
  return (
    <a
      href="#page"
      className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      Skip to content
    </a>
  )
}
