// Whether the reader asked for reduced motion (DESIGN.md 3.3, 10), as a reactive hook so an
// animation can be declined at runtime and its static final state shown instead.

import { useEffect, useState } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(QUERY).matches
    : false
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(prefersReducedMotion)
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const media = window.matchMedia(QUERY)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])
  return reduced
}
