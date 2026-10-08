// @vitest-environment node
import { describe, expect, it } from "vitest"

import { adapterLabel, orderAdapters } from "./adapters"

describe("adapters", () => {
  it("lists the four in their fixed order and keeps unknown ones last", () => {
    expect(orderAdapters(["rust", "go", "python", "typescript"])).toEqual([
      "python",
      "typescript",
      "go",
      "rust",
    ])
    expect(orderAdapters(["zig", "rust", "python"])).toEqual(["python", "rust", "zig"])
    expect(adapterLabel("rust")).toBe("Rust")
    expect(adapterLabel("zig")).toBe("zig")
  })
})
