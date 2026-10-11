// Which run each of Domain 2's suites is read from (the UI-D2 plan): reported results come from
// runs made outside any CI profile (the GPU host's `run`), while a CI profile's run is a replayed
// regression check, and the write-up itself combines runs (S6 at pilot size beside the rest at
// recorded size). So each suite is read from the newest finished run outside a CI profile that has
// it, else the newest finished run that has it; `?run=` pins every suite that run has. A run the
// index lists but the volume no longer holds (pruned, 6.4) is passed over once the page has seen
// it is gone, and the source says which run it stands in for. The composite is a view, not a
// record: nothing is written, and every panel names its run.

import type { D2RunsIndexV1 } from "@/data/schema/generated"
import { compareSuites, isFinished, runById, type RunEntry } from "@/features/d1/model/runs"

export type SuiteSource = {
  suite: string
  run: RunEntry
  /** Read from the pinned run, not chosen by the rule. */
  pinned: boolean
  /** The run the rule (or the pin) would read, passed over because it is pruned. */
  insteadOf?: RunEntry
}

export type Composite = {
  /** The run `?run=` names, when the index lists it. */
  pinned: RunEntry | undefined
  /** `?run=` names a run the index does not list. */
  unknownPin: string | null
  /** Every suite some finished run has, with the run it is read from, in suite order. */
  suites: SuiteSource[]
  /** The distinct runs the suites are read from, newest first. */
  runs: RunEntry[]
  /** The pruned runs some suite was read past, newest first. */
  passedOver: RunEntry[]
}

/**
 * The run each suite is read from. `pruned` names the runs the page has found gone from the
 * volume: the rule skips them and records, per suite, the run it would have read.
 */
export function composite(
  index: D2RunsIndexV1,
  pin?: string,
  pruned: ReadonlySet<string> = new Set(),
): Composite {
  const pinned = pin ? runById(index, pin) : undefined
  const finished = index.runs.filter(isFinished)
  const suiteIds = [...new Set(finished.flatMap((run) => run.suites))].sort(compareSuites)
  const choose = (candidates: RunEntry[]) =>
    candidates.find((candidate) => candidate.ci_profile === null) ?? candidates[0]
  const suites = suiteIds.flatMap((suite): SuiteSource[] => {
    const has = finished.filter((run) => run.suites.includes(suite))
    const wanted = pinned && pinned.suites.includes(suite) ? pinned : choose(has)
    if (!wanted) return []
    if (!pruned.has(wanted.run_id)) return [{ suite, run: wanted, pinned: wanted === pinned }]
    const run = choose(has.filter((candidate) => !pruned.has(candidate.run_id)))
    return run ? [{ suite, run, pinned: false, insteadOf: wanted }] : []
  })
  const ids = new Set(suites.map((source) => source.run.run_id))
  const passed = new Set(
    suites.flatMap((source) => (source.insteadOf ? [source.insteadOf.run_id] : [])),
  )
  return {
    pinned,
    unknownPin: pin && !pinned ? pin : null,
    suites,
    runs: index.runs.filter((run) => ids.has(run.run_id)),
    passedOver: index.runs.filter((run) => passed.has(run.run_id)),
  }
}

/** The run a suite is read from, when any run has it. */
export function sourceOf(view: Composite, suite: string): RunEntry | undefined {
  return view.suites.find((source) => source.suite === suite)?.run
}
