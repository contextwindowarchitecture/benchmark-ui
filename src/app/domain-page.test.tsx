import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { renderApp } from "@/test/render-app"

describe("a not-started domain's page", () => {
  it("carries the claim and the design, and nothing that looks like a result", async () => {
    renderApp("/d4")
    expect(
      await screen.findByRole("heading", { level: 1, name: /Domain 4 · Computational economics/ }),
    ).toBeInTheDocument()
    expect(screen.getByText("not started")).toBeInTheDocument()
    expect(
      screen.getByText(/CWA's stable serialization makes prefix caching pay/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/automatic prefix caching, such as vLLM and SGLang/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/pass/)).toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.getByRole("link", { name: "Domain 1 has results" })).toHaveAttribute(
      "href",
      "/d1",
    )
    await waitFor(() =>
      expect(document.title).toBe("Domain 4 · Economics and caching · CWA benchmark"),
    )
  })

  it("renders every not-started domain", async () => {
    for (const id of ["d2", "d3", "d5"]) {
      const { unmount } = renderApp(`/${id}`)
      expect(await screen.findByText("not started")).toBeInTheDocument()
      unmount()
    }
  })
})
