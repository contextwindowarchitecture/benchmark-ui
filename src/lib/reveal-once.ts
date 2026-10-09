// Reveal-once (ui-plan.md 7.4; DESIGN.md 4.5): a narrative page's signature chart reveals the
// first time a session shows it, and never again on refresh or route return. The flag lives in
// session storage, keyed by the chart and the record it draws, so a new run reveals once more.

import { useCallback, useState } from "react"

const PREFIX = "benchmark-ui.revealed:"

function read(key: string): boolean {
  try {
    return sessionStorage.getItem(PREFIX + key) === "1"
  } catch {
    return true // no storage: never animate, so a reload cannot replay the reveal
  }
}

function write(key: string): void {
  try {
    sessionStorage.setItem(PREFIX + key, "1")
  } catch {
    /* no storage: the flag lasts for the page */
  }
}

/**
 * Whether to reveal the chart named by `key` now, and a callback for when the reveal has run (or
 * was declined, under reduced motion), after which the session never reveals it again.
 */
export function useRevealOnce(key: string): { reveal: boolean; done: () => void } {
  const [reveal, setReveal] = useState<boolean>(() => !read(key))
  const done = useCallback(() => {
    write(key)
    setReveal(false)
  }, [key])
  return { reveal, done }
}
