// Focus restoration for the phone's navigation sheet (DESIGN.md 10). Radix returns the focus from a
// closed dialog to that dialog's own trigger, and the generated sidebar opens its sheet from a plain
// button, so there is none and the focus fell to the body. Once the sheet has left the DOM (after its
// exit animation), a focus still on the body goes back to the button that opened it; a link that
// closed the sheet by changing the route has already put the focus on the new page's title.

import { useEffect, useRef, type RefObject } from "react"

import { useSidebar } from "@/components/ui/sidebar"

/** How long to wait for the sheet's exit animation before giving up on it. */
const SHEET_EXIT_MS = 1_000

export function useSheetFocusReturn(trigger: RefObject<HTMLElement | null>): void {
  const { openMobile } = useSidebar()
  const wasOpen = useRef(false)
  useEffect(() => {
    if (openMobile) {
      wasOpen.current = true
      return
    }
    if (!wasOpen.current) return
    wasOpen.current = false
    const started = performance.now()
    let frame = 0
    const settle = () => {
      const sheet = document.querySelector('[role="dialog"][data-mobile="true"]')
      if (sheet && performance.now() - started < SHEET_EXIT_MS) {
        frame = requestAnimationFrame(settle)
        return
      }
      const active = document.activeElement
      if (!active || active === document.body) trigger.current?.focus()
    }
    frame = requestAnimationFrame(settle)
    return () => cancelAnimationFrame(frame)
  }, [openMobile, trigger])
}
