import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AdapterMark } from "./adapter-mark"
import { StatusBadge } from "./status-badge"

describe("StatusBadge", () => {
  it("shows text and an icon with the tone of the status", () => {
    const { container } = render(<StatusBadge status="pass" />)
    expect(screen.getByText("pass")).toBeInTheDocument()
    expect(container.querySelector("svg")).not.toBeNull()
    expect(container.querySelector("[data-tone]")).toHaveAttribute("data-tone", "success")
  })

  it("keeps info, partial and not run apart from pass and fail", () => {
    const tones = ["pass", "info", "fail", "partial", "not-run", "na"].map((status) =>
      render(<StatusBadge status={status} />)
        .container.querySelector("[data-tone]")
        ?.getAttribute("data-tone"),
    )
    expect(tones).toEqual(["success", "info", "destructive", "warning", "muted", "muted"])
    expect(screen.getByText("not run")).toBeInTheDocument()
    expect(screen.getByText("not measured")).toBeInTheDocument()
  })

  it("names an icon-only badge and renders an unknown status muted", () => {
    render(<StatusBadge status="regressed" iconOnly />)
    expect(screen.getByLabelText("regressed")).toBeInTheDocument()
    const { container } = render(<StatusBadge status="something-new" />)
    expect(screen.getByText("something-new")).toBeInTheDocument()
    expect(container.querySelector("[data-tone]")).toHaveAttribute("data-tone", "muted")
  })
})

describe("AdapterMark", () => {
  it("labels each adapter and names a symbol-only mark", () => {
    render(<AdapterMark adapter="typescript" />)
    expect(screen.getByText("TypeScript")).toBeInTheDocument()
    render(<AdapterMark adapter="go" symbolOnly />)
    expect(screen.getByRole("img", { name: "Go" })).toBeInTheDocument()
    render(<AdapterMark adapter="zig" />)
    expect(screen.getByText("zig")).toBeInTheDocument()
  })
})
