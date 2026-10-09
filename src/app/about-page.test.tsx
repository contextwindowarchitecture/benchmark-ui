import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { buildInfo } from "@/lib/build-info"
import { renderApp } from "@/test/render-app"

describe("about page", () => {
  it("carries the framing, the links and what this viewer reads", async () => {
    renderApp("/about")
    expect(await screen.findByRole("heading", { level: 1, name: "About" })).toBeInTheDocument()
    expect(
      screen.getByText(/Prompt engineering works at the level of a single message/),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Read the document/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/docs/benchmarking_cwa_viability.md"),
    )
    expect(screen.getByRole("link", { name: /docs\/domain1\.md/ })).toBeInTheDocument()
    expect(screen.getAllByText(/no write-up yet/)).toHaveLength(4)
    expect(screen.getByRole("link", { name: /The Rust assembler/ })).toHaveAttribute(
      "href",
      "https://github.com/contextwindowarchitecture/assembler-rust",
    )
    const viewer = document.getElementById("viewer") as HTMLElement
    expect(within(viewer).getByText(buildInfo.uiCommit)).toBeInTheDocument()
    const kinds = screen.getByRole("region", { name: "Schema kinds table" })
    expect(within(kinds).getAllByRole("row")).toHaveLength(buildInfo.kinds.length + 1)
    expect(within(kinds).getByText("cwa-bench-d1/sweep/v1")).toBeInTheDocument()
  })
})
