// @vitest-environment node
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { parseUrlState } from "./url-state"

describe("parseUrlState", () => {
  const shape = {
    profile: z.string().min(1),
    status: z.enum(["pass", "fail"]),
    sort: z.enum(["started"]),
  }

  it("keeps valid values and drops invalid ones independently", () => {
    const state = parseUrlState(
      shape,
      new URLSearchParams("profile=nightly&status=nope&sort=started"),
    )
    expect(state).toEqual({ profile: "nightly", status: undefined, sort: "started" })
  })

  it("leaves absent keys undefined", () => {
    expect(parseUrlState(shape, new URLSearchParams(""))).toEqual({
      profile: undefined,
      status: undefined,
      sort: undefined,
    })
  })
})
