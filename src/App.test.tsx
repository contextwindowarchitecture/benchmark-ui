import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { App } from "./App"

describe("App", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("shows a visible error when config.json is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    )
    render(<App />)
    expect(await screen.findByText("This site is not configured")).toBeInTheDocument()
    expect(screen.getByText(/answered 404/)).toBeInTheDocument()
  })

  it("shows a visible error when config.json is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('{"resultsRoot": 1}', { status: 200 })),
    )
    render(<App />)
    expect(await screen.findByText("This site is not configured")).toBeInTheDocument()
    expect(screen.getByText(/has no "resultsRoot" string/)).toBeInTheDocument()
  })
})
