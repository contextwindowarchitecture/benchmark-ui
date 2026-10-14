import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

import { loadValidators } from "@/data/validate"

// Later domains' validators load on first use in the app; tests that parse their documents
// directly (the model tests, fixtureRows) find them loaded.
await loadValidators("d2")
await loadValidators("d5")

afterEach(() => {
  cleanup()
  if (typeof window !== "undefined") {
    window.localStorage.clear()
    window.sessionStorage.clear()
  }
})

// jsdom has no matchMedia, ResizeObserver or scrollIntoView; the sidebar, the theme and the
// Radix primitives expect them.
if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!navigator.clipboard) {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(async () => undefined) },
      configurable: true,
    })
  }
}
