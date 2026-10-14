import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { PageSection } from "@/components/dashboard/dashboard-page"
import { StatusBadge, type StatusBadgeProps } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MetricCards } from "@/features/d1/components/metric-card"
import { SweepsTable } from "@/features/d1/components/sweeps/sweeps-table"
import {
  sweepRows,
  thresholdCells,
  type Scale,
  type ScaleThreshold,
} from "@/features/d1/model/scale"
import { adapterLabel, orderAdapters } from "@/lib/adapters"
import { formatCount } from "@/lib/format"

import { S7Rows } from "./s7-grid"
import { crossMetrics, type SuitePanelProps } from "./types"

/**
 * S7 (ui-plan.md 8.4): budget pressure at scale. The grid and the fixed windows from the rows, on
 * request; the threshold searches, timeouts, unbuildable cells, sweeps and timing loops from the
 * summary's typed scale block.
 */
export function S7Scale({ runId, summary, index }: SuitePanelProps) {
  const scale = summary.scale
  return (
    <PageSection
      title="Budget pressure at scale"
      id="panel"
      description={
        <span>
          Every shape from tens to thousands of candidates at shrinking budgets, the refusal
          threshold searched, and one cell per shape swept budget by budget.{" "}
          <Link to={`/d1/runs/${runId}/sweeps`} className="underline underline-offset-3">
            Shedding
          </Link>{" "}
          replays the sweeps;{" "}
          <Link to={`/d1/runs/${runId}/perf`} className="underline underline-offset-3">
            performance
          </Link>{" "}
          has the timings.
        </span>
      }
    >
      <MetricCards metrics={crossMetrics(summary)} />
      <S7Rows runId={runId} index={index} scale={scale} />
      {scale ? (
        <>
          <Thresholds scale={scale} />
          <Timeouts scale={scale} />
          <div className="space-y-2">
            <h3 className="text-base font-semibold">Sweeps</h3>
            <SweepsTable runId={runId} rows={sweepRows(scale, index)} shapes={scale.shapes} />
          </div>
          <NotConstructible scale={scale} />
          <TimingLoops scale={scale} />
        </>
      ) : (
        <p className="border border-dashed p-4 text-sm text-muted-foreground" data-state="empty">
          This run&apos;s summary has no scale block: no threshold searches, timeouts or sweeps to
          show.
        </p>
      )}
    </PageSection>
  )
}

const SEARCH_STATUS: Record<
  ScaleThreshold["status"],
  { status: StatusBadgeProps["status"]; label: string }
> = {
  exact: { status: "pass", label: "exact" },
  inexact: { status: "warning", label: "inexact" },
  full_did_not_assemble: { status: "fail", label: "full did not assemble" },
  not_constructible: { status: "na", label: "not constructible" },
}

function Thresholds({ scale }: { scale: Scale }) {
  const cells = thresholdCells(scale)
  const adapters = orderAdapters([...new Set(scale.thresholds.map((search) => search.adapter))])
  const exact = scale.thresholds.filter((search) => search.status === "exact").length
  const searched = scale.thresholds.filter((search) => search.status !== "not_constructible").length
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">Threshold searches</h3>
      <p className="text-sm text-muted-foreground">
        A binary search per cell and adapter for the smallest budget that assembles, against the
        harness&apos;s own charged count of the protected items (or the floor): {formatCount(exact)}{" "}
        of {formatCount(searched)} searches exact.
      </p>
      {cells.length === 0 ? (
        <p className="text-sm text-muted-foreground">This run searched no thresholds.</p>
      ) : (
        <TableRegion label="Threshold searches table">
          <Table>
            <TableCaption className="sr-only">
              One row per cell: the computed threshold and what it was computed from, then each
              adapter&apos;s search: its status, the budget found and the probes it made.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Cell</TableHead>
                <TableHead scope="col" className="text-right">
                  Computed
                </TableHead>
                {adapters.map((adapter) => (
                  <TableHead key={adapter} scope="col">
                    <AdapterMark adapter={adapter} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cells.map(({ cell, searches }) => {
                const computed = searches.find((search) => search.computed !== undefined)
                return (
                  <TableRow
                    key={`${cell.shape}|${cell.candidates}|${cell.candidate_tokens}`}
                    data-threshold-cell={cell.shape}
                  >
                    <TableCell className="text-sm">
                      <span className="font-medium">{cell.shape}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatCount(cell.candidates)} × {formatCount(cell.candidate_tokens)}
                      </span>
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {computed?.computed === undefined ? "—" : formatCount(computed.computed)}
                      {computed?.computed_from ? (
                        <span className="block text-xs text-muted-foreground">
                          {computed.computed_from}
                        </span>
                      ) : null}
                    </TableCell>
                    {adapters.map((adapter) => {
                      const search = searches.find((entry) => entry.adapter === adapter)
                      if (!search) return <TableCell key={adapter}>—</TableCell>
                      const badge = SEARCH_STATUS[search.status]
                      return (
                        <TableCell
                          key={adapter}
                          className="text-xs"
                          aria-label={`${adapterLabel(adapter)}: ${badge.label}${search.found != null ? `, found ${search.found}` : ""}${search.probes !== undefined ? ` in ${search.probes} probes` : ""}`}
                        >
                          <StatusBadge status={badge.status} label={badge.label} />
                          {search.found != null ? (
                            <span className="tabular block">
                              {formatCount(search.found)}
                              {search.probes !== undefined
                                ? ` · ${formatCount(search.probes)} probes`
                                : ""}
                            </span>
                          ) : null}
                          {search.detail ? (
                            <span className="block text-muted-foreground">{search.detail}</span>
                          ) : null}
                          {(search.mispredicted ?? 0) > 0 ||
                          (search.audit_failed?.length ?? 0) > 0 ? (
                            <span className="block text-warning">
                              {(search.mispredicted ?? 0) > 0
                                ? `${formatCount(search.mispredicted ?? 0)} probes not as predicted`
                                : ""}
                              {(search.audit_failed?.length ?? 0) > 0
                                ? ` audit failed ${search.audit_failed?.join(", ")}`
                                : ""}
                            </span>
                          ) : null}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableRegion>
      )}
    </div>
  )
}

function Timeouts({ scale }: { scale: Scale }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold">Timeouts</h3>
      <p className="text-sm text-muted-foreground">
        A call that runs past {formatCount(scale.settings.timeout_s)} s is a warning finding from
        the fault oracle, never a failure; the cells at least as much work after it are skipped for
        that adapter ({formatCount(scale.skipped)} answers skipped in all).
      </p>
      {scale.timeouts.length === 0 ? (
        <p className="text-sm" data-state="none">
          No call timed out.
        </p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {scale.timeouts.map((timeout, i) => (
            <li key={i} data-timeout={timeout.adapter}>
              {timeout.summary}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NotConstructible({ scale }: { scale: Scale }) {
  if (scale.not_constructible.length === 0) return null
  return (
    <details>
      <summary className="cursor-pointer text-sm text-muted-foreground">
        {formatCount(scale.not_constructible.length)} cells the generator cannot build
      </summary>
      <ul className="mt-2 space-y-1 text-xs">
        {scale.not_constructible.map((entry) => (
          <li key={`${entry.shape}|${entry.candidates}|${entry.candidate_tokens}`}>
            <span className="font-medium">{entry.shape}</span>, {formatCount(entry.candidates)} ×{" "}
            {formatCount(entry.candidate_tokens)}: {entry.why}
          </li>
        ))}
      </ul>
    </details>
  )
}

function TimingLoops({ scale }: { scale: Scale }) {
  const adapters = orderAdapters(Object.keys(scale.timing_loops))
  if (adapters.length === 0) return null
  return (
    <p className="text-sm text-muted-foreground">
      In-process timing loops:{" "}
      {adapters.map((adapter, i) => {
        const loop = scale.timing_loops[adapter]
        return (
          <span key={adapter}>
            {i > 0 ? "; " : ""}
            {adapterLabel(adapter)}{" "}
            {loop?.available ? "available" : `unavailable${loop?.error ? ` (${loop.error})` : ""}`}
          </span>
        )
      })}
      .
    </p>
  )
}
