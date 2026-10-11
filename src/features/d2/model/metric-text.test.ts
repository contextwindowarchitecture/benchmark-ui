import { describe, expect, it } from "vitest"

import { unsentFiledAsSent } from "./metric-text"

describe("the unsent answers filed under facts sent", () => {
  it("counts every unsent answer when the not-sent tally is empty, as before the harness's fix", () => {
    expect(unsentFiledAsSent({ overflow: 1215 }, { absent: { n: 0 } })).toEqual({
      count: 1215,
      atLeast: false,
    })
  })

  it("finds none when the not-sent tally holds them, as the fixed harness and refusals file them", () => {
    expect(unsentFiledAsSent({ overflow: 1215 }, { absent: { n: 1215 } })).toBeNull()
    expect(unsentFiledAsSent({ overflow: 0, refused: 3 }, { absent: { n: 234 } })).toBeNull()
    expect(unsentFiledAsSent({ overflow: 0 }, { absent: { n: 0 } })).toBeNull()
  })

  it("gives a floor when the not-sent tally holds some answers but fewer than reached no model", () => {
    expect(unsentFiledAsSent({ overflow: 10, refused: 2 }, { absent: { n: 4 } })).toEqual({
      count: 8,
      atLeast: true,
    })
  })
})
