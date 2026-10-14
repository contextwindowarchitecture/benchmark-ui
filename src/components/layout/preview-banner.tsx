import { Construction, X } from "lucide-react"
import { useState } from "react"

/** The session storage key that remembers a dismissal until the tab closes. */
const DISMISSED_KEY = "benchmark-ui.preview-banner-dismissed"

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1"
  } catch {
    return false
  }
}

/**
 * The notice that the site is still being built: orange and pulsing (tokens.css), above the sticky
 * header so it scrolls away with the page. Dismissing it hides it for the rest of the session.
 */
export function PreviewBanner() {
  const [dismissed, setDismissed] = useState(readDismissed)
  if (dismissed) return null
  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1")
    } catch {
      /* no storage: hidden until the next load */
    }
    setDismissed(true)
  }
  return (
    <section
      aria-label="Site notice"
      className="notice-pulse flex items-center gap-3 bg-notice px-4 py-2 text-sm text-notice-foreground"
    >
      <Construction aria-hidden="true" className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <strong className="font-semibold">This site is still being built.</strong> Pages may change,
        move or be incomplete while we finish it.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notice"
        className="-my-1 flex size-8 shrink-0 items-center justify-center outline-none hover:bg-notice-foreground/10 focus-visible:ring-2 focus-visible:ring-notice-foreground"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </section>
  )
}
