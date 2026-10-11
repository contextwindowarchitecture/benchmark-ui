// The panels of a suite summary's typed blocks (the UI-D2 plan; harness ask 13): the model and
// its calls, where the needed facts were, the breakdowns by family, turn count, rule, kind and
// format at one tier, S4's abstentions and prompt sizes, S6's comparison with the scripted suite
// and its replies' length, and S5's cost. Every number is the producer's; the words beside the
// ids come from the content files.

import { Fragment } from "react"

import { TableRegion } from "@/components/dashboard/table-region"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { entriesOf } from "@/features/d1/model/findings"
import {
  answerLengthTurns,
  bandLabel,
  byArmAndTier,
  costGroups,
  defaultTier,
  replyTurns,
  share,
  type ArmBlock,
  type Breakdown,
  type CostBlock,
  type LoopArm,
  type LqArm,
  type ModelBlock,
  type Percentiles,
} from "@/features/d2/model/blocks"
import { intervalLevel, unsentFiledAsSent } from "@/features/d2/model/metric-text"
import { parseTier, tierLabel } from "@/features/d2/model/metrics"
import { d2SuitePageParams } from "@/features/d2/model/url"
import {
  formatCount,
  formatMeanTokens,
  formatMs,
  formatPercent,
  formatPointsDifference,
  formatPointsDifferenceInterval,
  formatRate,
  formatTokens,
} from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { ArmLabel } from "./arm-label"
import { GroupedArmTable, ShareCell, type ArmCell } from "./grouped-arm-table"

const MODE_WORDS: Record<ModelBlock["mode"], string> = {
  llm: "called the endpoint; replies not yet cached were recorded",
  replay: "replayed from the cache; no call reached an endpoint",
}

/** The model, its settings and cache, and the calls the suite made, from the typed block. */
export function ModelPanel({ block }: { block: ModelBlock }) {
  const facts: [string, string][] = [
    ["Model", block.model],
    ["Endpoint", block.endpoint_host],
    ["Mode", MODE_WORDS[block.mode]],
    [
      "Sampling",
      `temperature ${block.params.temperature}, up to ${formatTokens(block.params.max_tokens)} per reply${block.params.seed === undefined ? "" : `, seed ${block.params.seed}`}`,
    ],
    ["Context limit", block.context_limit === null ? "not set" : formatTokens(block.context_limit)],
    ["Concurrency", `${formatCount(block.concurrency)} calls in flight`],
    [
      "Calls",
      `${formatCount(block.calls)} asked, ${formatCount(block.cache_hits)} from the cache, ${formatCount(block.endpoint_calls)} to the endpoint`,
    ],
    ["Cache", `${formatCount(block.cache_entries)} entries at ${block.cache}`],
  ]
  const excluded = Object.entries(block.excluded_by_gate ?? {}).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number",
  )
  if (block.excluded_by_gate) {
    facts.push([
      "Left out by the gate",
      excluded.length === 0
        ? "no probe: every arm passed S1's gate"
        : excluded.map(([arm, count]) => `${arm}: ${formatCount(count)}`).join(", "),
    ])
  }
  if (block.chains) {
    const ends = Object.entries(block.chains.by_end).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    )
    facts.push([
      "Chains",
      `${formatCount(block.chains.total)}, ${ends.map(([end, count]) => `${formatCount(count)} ${end}`).join(", ")}; ${formatCount(block.chains.probes_left_out)} probes left out`,
    ])
  }
  const server = entriesOf(block.server ?? undefined)
  const extra = entriesOf(block.params.extra_body)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>The model and its calls</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
            {facts.map(([term, text]) => (
              <Fragment key={term}>
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="break-words">{text}</dd>
              </Fragment>
            ))}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>What the request carried, and what the endpoint said of itself</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            The request's extra fields are passed to the server as configured, and the server's own
            listing of the model is kept as it gave it; both are shown as they are, not read by
            name.
          </p>
          {extra.length > 0 ? (
            <dl className="grid gap-x-3 gap-y-1 font-mono text-xs sm:grid-cols-[auto_minmax(0,1fr)]">
              {extra.map((entry) => (
                <Fragment key={entry.key}>
                  <dt className="text-muted-foreground">{entry.key}</dt>
                  <dd className="break-all">{entry.value}</dd>
                </Fragment>
              ))}
            </dl>
          ) : (
            <p className="text-muted-foreground">No extra request fields.</p>
          )}
          {server.length > 0 ? (
            <dl className="grid gap-x-3 gap-y-1 font-mono text-xs sm:grid-cols-[auto_minmax(0,1fr)]">
              {server.map((entry) => (
                <Fragment key={entry.key}>
                  <dt className="text-muted-foreground">{entry.key}</dt>
                  <dd className="break-all">{entry.value}</dd>
                </Fragment>
              ))}
            </dl>
          ) : (
            <p className="text-muted-foreground">
              {block.mode === "replay"
                ? "A replay reaches no server, so none described itself."
                : "The endpoint listed nothing under the model's name."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** The grades split by whether the needed facts were in the payload sent, by arm and tier. */
export function GivenTable({ entries, label }: { entries: readonly ArmBlock[]; label: string }) {
  const layout = byArmAndTier(entries)
  const cell = (arm: string, tier: string): ArmCell => {
    const entry = layout.at(arm, tier)
    if (!entry) return null
    const { present, absent } = entry.given
    const sent = formatRate(share(present.n, present.correct), present.correct, present.n)
    const unsent = formatRate(share(absent.n, absent.correct), absent.correct, absent.n)
    // Answers that reached no model yet sit under "facts sent", as runs before the harness's fix
    // file them.
    const misfiled = unsentFiledAsSent(entry.verdicts, entry.given)
    const flag = misfiled
      ? `${misfiled.atLeast ? "at least " : ""}${formatCount(misfiled.count)} of these reached no model`
      : null
    return {
      node: (
        <span className="inline-flex flex-col items-end gap-0.5">
          <span>
            <span className="text-xs text-muted-foreground">sent </span>
            {present.n === 0 ? "none" : sent}
          </span>
          <span className="text-xs">
            <span className="text-muted-foreground">not sent </span>
            {absent.n === 0 ? "none" : unsent}
          </span>
          {flag ? <span className="text-xs text-warning">† {flag}</span> : null}
        </span>
      ),
      text: `with the facts sent ${present.n === 0 ? "none" : sent}; not sent ${absent.n === 0 ? "none" : unsent}${flag ? `; ${flag}` : ""}`,
    }
  }
  const flagged = entries.some((entry) => unsentFiledAsSent(entry.verdicts, entry.given) !== null)
  return (
    <div className="space-y-2">
      <GroupedArmTable
        label={label}
        caption="Correct answers among the probes whose needed facts were in the payload, and among those whose facts were not, by arm and tier."
        arms={layout.arms}
        columns={layout.tiers.map((tier) => ({ key: tier, label: tierLabel(tier) }))}
        cell={cell}
      />
      <p className="text-xs text-muted-foreground">
        A probe whose answer needs no fact is in neither tally.
        {flagged
          ? " † An overflow or a refusal reaches no model. This run's harness filed such an answer by whether S1 found the facts in the payload the arm would have sent, so it can be counted under facts sent although nothing was sent; the harness now files them as not sent."
          : ""}
      </p>
    </div>
  )
}

/**
 * The breakdowns at one tier, the tier chosen in the address (`at`): arms down, the breakdown's
 * keys across, each cell the share and its fraction. An upper bound, which has no budget, is
 * read at its own tier and the table says so.
 */
export function BreakdownsPanel({
  entries,
  breakdowns,
  suite,
}: {
  entries: readonly ArmBlock[]
  breakdowns: readonly Breakdown[]
  suite: string
}) {
  const [state, setState] = useUrlState(d2SuitePageParams)
  const layout = byArmAndTier(entries)
  const tiers = layout.tiers.filter((tier) => parseTier(tier).kind !== "control")
  const tier = tiers.includes(state.at ?? "") ? (state.at as string) : defaultTier(tiers)
  if (!tier || breakdowns.length === 0) {
    return (
      <p
        className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        data-state="empty"
      >
        {suite} recorded no breakdown in this run.
      </p>
    )
  }
  const hasControls = layout.tiers.includes("control")
  const entryFor = (arm: string) => layout.at(arm, tier) ?? layout.at(arm, "control")
  const arms = layout.arms.filter((arm) => entryFor(arm.id) !== undefined)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">At</span>
          <Select value={tier} onValueChange={(value) => setState({ at: value })}>
            <SelectTrigger size="sm" className="w-56" aria-label="Tier the breakdowns are read at">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiers.map((candidate) => (
                <SelectItem key={candidate} value={candidate}>
                  {tierLabel(candidate)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {hasControls ? (
          <span className="text-xs text-muted-foreground">
            The upper bounds are read at no budget, their own tier.
          </span>
        ) : null}
      </div>
      {breakdowns.map((breakdown) => (
        <section
          key={breakdown.id}
          className="space-y-2"
          aria-labelledby={`breakdown-${breakdown.id}-title`}
        >
          <h3 id={`breakdown-${breakdown.id}-title`} className="font-medium">
            {breakdown.title}
          </h3>
          <p className="max-w-prose text-xs text-muted-foreground">{breakdown.description}</p>
          <GroupedArmTable
            label={`${breakdown.title} at ${tierLabel(tier)}`}
            caption={`${breakdown.description} Each cell is the share ${breakdown.measure} with its fraction, at ${tierLabel(tier)}.`}
            arms={arms}
            columns={breakdown.keys.map((key) => ({ key, label: breakdown.keyLabel(key) }))}
            cell={(arm, key) => {
              const entry = entryFor(arm)
              const tally = entry ? breakdown.cell(entry, key) : undefined
              if (!tally) return null
              const percent = share(tally.n, tally.k)
              const fraction = `${formatCount(tally.k)} / ${formatCount(tally.n)}`
              return {
                node: (
                  <ShareCell
                    percent={percent === null ? null : formatPercent(percent)}
                    fraction={fraction}
                  />
                ),
                text: formatRate(percent, tally.k, tally.n),
              }
            }}
          />
        </section>
      ))}
    </div>
  )
}

/** S4's abstentions and the payloads' mean size, by arm and corpus tier. */
export function LqExtrasTable({ entries }: { entries: readonly LqArm[] }) {
  const layout = byArmAndTier(entries)
  return (
    <GroupedArmTable
      label="Abstentions and prompt size by arm and corpus size"
      caption="Answerable questions answered NOT FOUND, of all answerable ones, and the payload's own mean token count, by arm and corpus size."
      arms={layout.arms}
      columns={layout.tiers.map((tier) => ({ key: tier, label: tierLabel(tier) }))}
      cell={(arm, tier) => {
        const entry = layout.at(arm, tier)
        if (!entry) return null
        const abstained = formatRate(
          share(entry.abstained.n, entry.abstained.count),
          entry.abstained.count,
          entry.abstained.n,
        )
        const size =
          entry.input_tokens_mean === null
            ? "size not counted"
            : formatTokens(entry.input_tokens_mean)
        return {
          node: (
            <span className="inline-flex flex-col items-end">
              <span>{abstained}</span>
              <span className="text-xs text-muted-foreground">{size}</span>
            </span>
          ),
          text: `abstained ${abstained}; payloads of ${size} on average`,
        }
      }}
    />
  )
}

/** S6: each arm's aptitude in the loop and against the scripted suite, then its replies' length. */
export function LoopBlocks({ entries }: { entries: readonly LoopArm[] }) {
  const layout = byArmAndTier(entries)
  const scripted = entries.find((entry) => entry.against_scripted)?.against_scripted?.suite
  const turns = replyTurns(entries)
  const tier = layout.tiers[0]
  return (
    <div className="space-y-6">
      <GroupedArmTable
        label="Against the scripted result"
        caption={`Each arm's correct answers in the loop with its interval and, per probe, its share correct less ${scripted ?? "the scripted suite"}'s on the same probes, averaged, with its interval.`}
        arms={layout.arms}
        columns={[
          { key: "aptitude", label: `Correct answers at ${tier ? tierLabel(tier) : "the budget"}` },
          { key: "against", label: `Less ${scripted ?? "the scripted suite"}'s` },
        ]}
        cell={(arm, column) => {
          const entry = tier ? layout.at(arm, tier) : undefined
          if (!entry) return null
          if (column === "aptitude") {
            const main = formatRate(entry.aptitude, entry.verdicts.correct, entry.n)
            const interval = `${formatPercent(entry.interval.low)} to ${formatPercent(entry.interval.high)}`
            return {
              node: (
                <span className="inline-flex flex-col items-end">
                  <span>{main}</span>
                  <span className="text-xs text-muted-foreground">{interval}</span>
                </span>
              ),
              text: `${main}, ${intervalLevel(entry.interval.level)} interval ${interval}`,
            }
          }
          const against = entry.against_scripted
          // Null when the scripted suite did not run, or ran on no probe the loop also asked.
          if (!against) {
            return {
              node: <span className="text-muted-foreground">not compared</span>,
              text: "not compared: no scripted result on the same probes",
            }
          }
          const difference = formatPointsDifference(against.difference)
          const interval = formatPointsDifferenceInterval(
            against.interval.low,
            against.interval.high,
          )
          return {
            node: (
              <span className="inline-flex flex-col items-end">
                <span>{difference}</span>
                <span className="text-xs text-muted-foreground">{interval}</span>
              </span>
            ),
            text: `${difference} against ${against.suite}, ${intervalLevel(against.interval.level)} interval ${interval}, over ${formatCount(against.probes)} probes`,
          }
        }}
      />
      {turns.length > 0 ? (
        <section className="space-y-2" aria-labelledby="reply-length-title">
          <h3 id="reply-length-title" className="font-medium">
            The replies' length over the conversation
          </h3>
          <p className="max-w-prose text-xs text-muted-foreground">
            The mean completion tokens of the model's own turns, which become the next turn's
            history, by the first turn of each ten: whether answers bloat as the conversation goes.
          </p>
          <GroupedArmTable
            label="Reply length by turn"
            caption="The mean completion tokens of the model's own replies, by arm, at the first turn of each ten."
            arms={layout.arms}
            columns={turns.map((turn) => ({ key: turn, label: `turn ${turn}` }))}
            cell={(arm, turn) => {
              const entry = tier ? layout.at(arm, tier) : undefined
              const mean = entry?.reply_tokens_by_turn[turn]
              return mean === undefined
                ? null
                : { node: formatMeanTokens(mean), text: formatMeanTokens(mean) }
            }}
          />
        </section>
      ) : null}
    </div>
  )
}

const signedPercent = (value: number) =>
  value === 0 ? formatPercent(0) : `${value < 0 ? "−" : "+"}${formatPercent(Math.abs(value))}`

/**
 * p50 and p95 in a unit, with the count, the max and, where a sum means something (tokens, not
 * the estimator's relative error), the total as the title.
 */
function percentilesCell(
  percentiles: Percentiles,
  format: (value: number) => string,
  { total = true }: { total?: boolean } = {},
): ArmCell {
  if (percentiles.count === 0 || percentiles.p50 === null || percentiles.p95 === null) {
    return null
  }
  const text = `${format(percentiles.p50)}, p95 ${format(percentiles.p95)}`
  const detail = `over ${formatCount(percentiles.count)}${percentiles.max === null ? "" : `, max ${format(percentiles.max)}`}${total && percentiles.total !== null ? `, total ${format(percentiles.total)}` : ""}`
  return {
    node: (
      <span className="inline-flex flex-col items-end" title={detail}>
        <span>{format(percentiles.p50)}</span>
        <span className="text-xs text-muted-foreground">p95 {format(percentiles.p95)}</span>
      </span>
    ),
    text: `${text} ${detail}`,
  }
}

/** S5's typed cost block: the margin and the under-count, then tokens and latency per arm. */
export function CostPanel({ block }: { block: CostBlock }) {
  const groups = costGroups(block)
  const columns: {
    key: string
    label: string
    cell: (row: CostBlock["by_arm"][number]) => ArmCell
  }[] = [
    {
      // Of the answers the model gave: an overflow, which reaches no model, is not among them, so
      // this is not the arm's accuracy over its probes.
      key: "answered",
      label: "Correct of answered",
      cell: (row) =>
        row.answered === 0
          ? {
              node: <span className="text-muted-foreground">none answered</span>,
              text: "none answered",
            }
          : {
              node: (
                <ShareCell
                  percent={formatPercent(row.correct / row.answered)}
                  fraction={`${formatCount(row.correct)} / ${formatCount(row.answered)}`}
                />
              ),
              text: `${formatCount(row.correct)} correct of ${formatCount(row.answered)} answered`,
            },
    },
    {
      key: "prompt",
      label: "Prompt tokens",
      cell: (row) => percentilesCell(row.prompt_tokens, formatCount),
    },
    {
      key: "per-correct",
      label: "Per correct answer",
      cell: (row) =>
        row.prompt_tokens_per_correct === null
          ? null
          : {
              node: formatTokens(row.prompt_tokens_per_correct),
              text: formatTokens(row.prompt_tokens_per_correct),
            },
    },
    {
      key: "completion",
      label: "Completion tokens",
      cell: (row) => percentilesCell(row.completion_tokens, formatCount),
    },
    { key: "latency", label: "Latency", cell: (row) => percentilesCell(row.latency_ms, formatMs) },
    {
      key: "estimate",
      label: "Own count less the server's",
      cell: (row) => percentilesCell(row.estimator_error, signedPercent, { total: false }),
    },
    {
      key: "cached",
      label: "Prefix-cached tokens",
      cell: (row) => ({
        node: formatCount(row.cached_tokens),
        text: formatCount(row.cached_tokens),
      }),
    },
  ]
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>The margin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-2xl font-semibold tabular">
              {formatPercent(block.margin_percent / 100)}
            </p>
            <p className="text-muted-foreground">
              charged over every payload's own token count, so the server's prompt stays within the
              budget.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>The largest under-count</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-2xl font-semibold tabular">
              {block.undercount_max === null
                ? "none measured"
                : formatPercent(block.undercount_max)}
            </p>
            <p className="text-muted-foreground">
              of the server's prompt tokens that the payload's own count missed, over every answered
              call.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Budget overruns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-2xl font-semibold tabular">{formatCount(block.budget_overruns)}</p>
            <p className="text-muted-foreground">
              calls whose server prompt exceeded the budget their payload was charged against
              (R-16); any fails the suite.
            </p>
          </CardContent>
        </Card>
      </div>
      <section className="space-y-2" aria-labelledby="undercount-title">
        <h3 id="undercount-title" className="font-medium">
          The under-count by prompt size
        </h3>
        <p className="max-w-prose text-xs text-muted-foreground">
          The server's count includes its chat template, which the payload's does not, so short
          prompts are under-counted by a larger share; each band shows the margin that would cover
          its worst call.
        </p>
        <TableRegion label="Under-count by prompt size">
          <Table>
            <TableCaption className="sr-only">
              For each band of server prompt tokens, the calls in it, the largest under-count and
              the margin that would cover it.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Server prompt tokens</TableHead>
                <TableHead scope="col" className="text-right">
                  Calls
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Largest under-count
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Margin needed
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {block.undercount_by_size.map((band) => (
                <TableRow key={band.server_tokens.join("-")}>
                  <TableCell scope="row">{bandLabel(band.server_tokens, formatCount)}</TableCell>
                  <TableCell className="tabular text-right">{formatCount(band.calls)}</TableCell>
                  <TableCell className="tabular text-right">
                    {band.undercount_max === null ? (
                      <span className="text-muted-foreground">no call</span>
                    ) : (
                      formatPercent(band.undercount_max)
                    )}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {band.margin_needed === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      formatPercent(band.margin_needed / 100)
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRegion>
      </section>
      <section className="space-y-2" aria-labelledby="cost-by-arm-title">
        <h3 id="cost-by-arm-title" className="font-medium">
          Tokens and latency by suite, arm and tier
        </h3>
        <p className="max-w-prose text-xs text-muted-foreground">
          Per answered probe: the server's prompt and completion tokens, the latency of the call
          that answered as recorded when the cache was filled, and the payload's own count against
          the server's (negative when the estimator under-counts).
        </p>
        <TableRegion label="Cost by suite, arm and tier">
          <Table>
            <TableCaption className="sr-only">
              For each suite, arm and tier: answered and correct probes, prompt tokens (p50 and
              p95), prompt tokens per correct answer, completion tokens, latency, the estimator's
              error and the prefix-cached tokens.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Arm</TableHead>
                <TableHead scope="col">Tier</TableHead>
                {columns.map((column) => (
                  <TableHead key={column.key} scope="col" className="text-right">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <Fragment key={group.suite}>
                  <TableRow className="border-t-2 hover:bg-transparent">
                    <TableCell
                      colSpan={columns.length + 2}
                      scope="rowgroup"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      {group.suite}
                    </TableCell>
                  </TableRow>
                  {group.rows.map((row) => (
                    <TableRow key={`${row.suite}-${row.arm}-${row.tier}`} data-arm={row.arm}>
                      <TableCell scope="row" className="align-top">
                        <ArmLabel arm={row.arm} />
                      </TableCell>
                      <TableCell className="align-top text-xs whitespace-nowrap">
                        {tierLabel(row.tier)}
                      </TableCell>
                      {columns.map((column) => {
                        const value = column.cell(row)
                        const name = `${row.arm}, ${tierLabel(row.tier)}, ${column.label}: ${value ? value.text : "not measured"}`
                        return (
                          <TableCell
                            key={column.key}
                            className="tabular text-right align-top"
                            aria-label={name}
                            title={name}
                          >
                            {value ? value.node : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableRegion>
      </section>
      {groups.map((group) => {
        const turns = answerLengthTurns(group.rows)
        if (turns.length === 0) return null
        return (
          <section
            key={group.suite}
            className="space-y-2"
            aria-labelledby={`answer-length-${group.suite}-title`}
          >
            <h3 id={`answer-length-${group.suite}-title`} className="font-medium">
              Answer length by conversation length ({group.suite})
            </h3>
            <p className="max-w-prose text-xs text-muted-foreground">
              Completion tokens by the conversation's turn count: the study's answer bloat.
            </p>
            <TableRegion label={`Answer length by turn count, ${group.suite}`}>
              <Table>
                <TableCaption className="sr-only">
                  Completion tokens, p50 and p95, by arm and tier for conversations of each turn
                  count.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Arm</TableHead>
                    <TableHead scope="col">Tier</TableHead>
                    {turns.map((turn) => (
                      <TableHead key={turn} scope="col" className="text-right">
                        {turn} turns
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((row) => (
                    <TableRow key={`${row.arm}-${row.tier}`} data-arm={row.arm}>
                      <TableCell scope="row" className="align-top">
                        <ArmLabel arm={row.arm} />
                      </TableCell>
                      <TableCell className="align-top text-xs whitespace-nowrap">
                        {tierLabel(row.tier)}
                      </TableCell>
                      {turns.map((turn) => {
                        const percentiles = row.answer_length_by_turns[turn]
                        const value = percentiles ? percentilesCell(percentiles, formatCount) : null
                        const name = `${row.arm}, ${tierLabel(row.tier)}, ${turn} turns: ${value ? value.text : "not measured"}`
                        return (
                          <TableCell
                            key={turn}
                            className="tabular text-right align-top"
                            aria-label={name}
                            title={name}
                          >
                            {value ? value.node : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableRegion>
          </section>
        )
      })}
    </div>
  )
}
