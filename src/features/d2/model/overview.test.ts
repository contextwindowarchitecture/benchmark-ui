// @vitest-environment node
import { describe, expect, it } from "vitest"

import { d2Document } from "@/test/d2-fixture"
import { D2_FIXTURE_RUNS } from "@/test/fixture-fetch"

import { armBlocks } from "./blocks"
import { attributionRows, pairedRows } from "./overview"

const run = D2_FIXTURE_RUNS.nightly
const blocks = (suite: string) =>
  armBlocks(d2Document(`${run}/suites/${suite}/summary.json`, "d2/suite-summary"))

describe("the overview's rows from the by_arm blocks", () => {
  it("pair every arm but the reference and the upper bounds at the budget, in order", () => {
    const rows = pairedRows(blocks("S2").scripted, "8192")
    expect(rows.map((row) => row.id)).toEqual([
      "concat",
      "truncate",
      "window",
      "summary",
      "cwa-history",
      "cwa-state",
      "cwa-state-x",
      "cwa-memory",
      "cwa-pipeline",
      "cwa-format",
    ])
    expect(rows[0]).toMatchObject({
      group: "conventional",
      tier: "8192",
      value: -0.203704,
      low: -0.289524,
      high: -0.095588,
    })
    expect(rows[0]?.paired.reference).toBe("truncate-pinned")
    expect(pairedRows(blocks("S2").scripted, "control")).toEqual([])
    expect(pairedRows(blocks("S4").lq, "x16").map((row) => row.id)).toEqual([
      "control-full",
      "truncate-pinned",
      "cwa-evidence",
      "cwa-reinforced",
      "cwa-ranked",
    ])
  })

  it("attribute at the budget, the upper bounds at their own tier", () => {
    const rows = attributionRows(blocks("S2").scripted, "8192")
    expect(rows[0]).toMatchObject({ arm: "control-full", tier: "control" })
    expect(rows.find((row) => row.arm === "window")).toMatchObject({
      tier: "8192",
      given: { present: { n: 240, correct: 231 }, absent: { n: 192, correct: 0 } },
    })
    // This run's harness files every overflow as not sent: concat's 135 are its "not sent" tally.
    const concat = rows.find((row) => row.arm === "concat")
    expect(concat?.given.absent.n).toBe(135)
    expect(concat?.filedAsSent).toBeNull()
    expect(rows.find((row) => row.arm === "window")?.filedAsSent).toBeNull()
    // A harness before the fix filed them under facts sent; the row says how many reached no model.
    const misfiled = attributionRows(
      blocks("S2").scripted.map((entry) =>
        entry.arm === "concat" && entry.tier === "8192"
          ? {
              ...entry,
              given: {
                present: {
                  n: entry.given.present.n + entry.given.absent.n,
                  correct: entry.given.present.correct + entry.given.absent.correct,
                },
                absent: { n: 0, correct: 0 },
              },
            }
          : entry,
      ),
      "8192",
    )
    expect(misfiled.find((row) => row.arm === "concat")?.filedAsSent).toEqual({
      count: 135,
      atLeast: false,
    })
    expect(rows.map((row) => row.arm)).toHaveLength(13)
    expect(attributionRows([], "8192")).toEqual([])
  })
})
