// The measured width of a container (DESIGN.md 7: measure the actual container for chart
// layout), through one ResizeObserver per measured element, disconnected on unmount.

import { useCallback, useEffect, useRef, useState } from "react"

export type Measured<T extends Element> = {
  /** Attach to the element to measure; a callback ref, so a re-render never re-observes. */
  ref: (node: T | null) => void
  /** The element's content width in CSS pixels; 0 until it is laid out. */
  width: number
}

export function useMeasure<T extends Element = HTMLDivElement>(): Measured<T> {
  const [width, setWidth] = useState(0)
  const observer = useRef<ResizeObserver | null>(null)
  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!node) return
    setWidth(node.getBoundingClientRect().width)
    if (typeof ResizeObserver !== "function") return
    const next = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    next.observe(node)
    observer.current = next
  }, [])
  useEffect(() => () => observer.current?.disconnect(), [])
  return { ref, width }
}
