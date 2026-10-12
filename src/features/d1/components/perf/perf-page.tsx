// S7's performance (ui-plan.md 8.7): from perf/summary.json alone, with the reliability banner over
// everything the harness marks unreliable (5.6). Startup per adapter, the write-up's median
// exponents, the scaling fits as small multiples, throughput and time to refusal, and every cell,
// filtered and paged. Absolute numbers belong to the host the manifest describes, and the page says
// so. Loaded lazily with D3.

import { Download, TriangleAlert } from "lucide-react"
import { useMemo } from "react"
import { Link, useParams } from "react-router"

import { ScalingPlots } from "@/components/charts/scaling-plots"
import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { Outcome } from "@/components/dashboard/outcome"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PEAK_MEMORY_NOTE, sourceUrl } from "@/content"
import { documentOf, useResultsSource, useRunDocument, useRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { PerfSummaryV1, RunIndexV1 } from "@/data/schema/generated"
import { ExponentsTable } from "@/features/d1/components/overview/exponents-table"
import {
  filterCells,
  FIT_METHODS,
  FIT_SERIES,
  fitLabels,
  scalingPanels,
  type FitMethod,
  type FitSeries,
  type PerfCell,
  uniformPeakMemory,
} from "@/features/d1/model/perf"
import { newestRunWithSuite, parseRunId } from "@/features/d1/model/runs"
import { runHasSuite } from "@/features/d1/model/suite"
import { perfParams } from "@/features/d1/model/url"
import { adapterLabel, orderAdapters } from "@/lib/adapters"
import { formatBytes, formatCount, formatMs } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

const PERF = "perf/summary.json"
const SAMPLES = "perf/samples.jsonl"
const PAGE_SIZE = 50
const ALL = "all"

const SERIES_WORDS: Record<FitSeries, string> = {
  candidates: "candidates at fixed tokens",
  tokens: "tokens at fixed candidates",
  diagonal: "both, at fixed tokens per candidate",
}

const METHOD_LABELS: Record<FitMethod, string> = {
  inprocess: "in-process",
  net: "net",
  e2e: "end to end",
}

export function PerfPage() {
  const { runId = "" } = useParams()
  const parts = parseRunId(runId)
  const runsIndex = useRunsIndex()
  const index = useRunDocument(parts ? runId : undefined, "index.json", "run-index")
  const runIndex = documentOf(index.data)
  const listed = runIndex?.files.some((file) => file.path === PERF) ?? false
  const perf = useRunDocument(runId, PERF, "perf-summary", { enabled: listed })

  const indexRegion: RegionState<RunIndexV1> = parts
    ? regionOfDocument(index, `${runId}/index.json`, `Run ${runId}`)
    : { status: "empty", message: `${runId} is not a run id.` }

  return (
    <DashboardPage
      title="Performance"
      width="wide"
      description={
        <span>
          S7&apos;s timings in run{" "}
          <Link to={`/d1/runs/${runId}`} className="font-mono underline underline-offset-3">
            {runId}
          </Link>
          , measured serially on the host its manifest describes: absolute numbers belong to that
          host, the exponents travel.
        </span>
      }
    >
      <DataRegion
        state={indexRegion}
        label="the run"
        skeleton={<Skeleton className="h-64 w-full" />}
      >
        {(run) => {
          if (!runHasSuite(run, "S7")) {
            const newest = runsIndex.data?.ok
              ? newestRunWithSuite(runsIndex.data.document, "S7")
              : undefined
            return (
              <DataRegion
                state={{
                  status: "absent",
                  what: "S7's performance",
                  newest: newest
                    ? { runId: newest.run_id, to: `/d1/runs/${newest.run_id}/perf` }
                    : undefined,
                }}
                label="the performance summary"
              >
                {() => null}
              </DataRegion>
            )
          }
          if (!listed) {
            return (
              <DataRegion
                state={{
                  status: "empty",
                  message:
                    "This run's S7 made no performance measurements (its perf setting was off).",
                }}
                label="the performance summary"
              >
                {() => null}
              </DataRegion>
            )
          }
          return (
            <DataRegion
              state={regionOfDocument(perf, `${runId}/${PERF}`, "The performance summary")}
              label="the performance summary"
              skeleton={<Skeleton className="h-96 w-full" />}
            >
              {(document) => <PerfBody runId={runId} run={run} perf={document} />}
            </DataRegion>
          )
        }}
      </DataRegion>
    </DashboardPage>
  )
}

function PerfBody({ runId, run, perf }: { runId: string; run: RunIndexV1; perf: PerfSummaryV1 }) {
  const source = useResultsSource()
  const reliable = perf.reliable && perf.host_suspended_seconds === 0
  const samples = run.files.find((file) => file.path === SAMPLES)
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
      {!reliable ? (
        <Alert data-state="unreliable">
          <TriangleAlert className="text-warning" />
          <AlertTitle>The harness marks these timings unreliable</AlertTitle>
          <AlertDescription>
            {perf.host_suspended_seconds > 0
              ? `The host was suspended for ${perf.host_suspended_seconds} s while measuring. `
              : ""}
            Every number below is shown as recorded, and no headline exponent is drawn from them.
          </AlertDescription>
        </Alert>
      ) : null}
      <PageSection
        title="Startup"
        id="startup"
        description="A minimal snapshot per adapter: the cost of starting the adapter, which the net times subtract."
      >
        <StartupTable perf={perf} />
        <PeakMemoryNote perf={perf} />
      </PageSection>
      {reliable ? (
        <PageSection
          title="Pressure exponents"
          id="exponents"
          description="The write-up's table: the median in-process exponent over shapes, with and without budget pressure."
        >
          <ExponentsTable perf={perf} runId={runId} />
        </PageSection>
      ) : null}
      <Scaling perf={perf} />
      <PageSection
        title="Throughput and time to refusal"
        id="throughput"
        description="Invocations per second on one cell at one and at full concurrency, and how long a refusal takes."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          <ThroughputTable perf={perf} />
          <RefusalTable perf={perf} />
        </div>
      </PageSection>
      <Cells perf={perf} />
      <PageSection
        title="How it was measured"
        id="policy"
        description="The sampling policy and the methods, as the summary records them."
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <Term label="Warm-up runs" value={formatCount(perf.policy.warmup)} />
          <Term
            label="Samples"
            value={`${formatCount(perf.policy.min_samples)} to ${formatCount(perf.policy.max_samples)}`}
          />
          <Term
            label="Slow cells"
            value={`${formatCount(perf.policy.min_slow)} samples past ${formatMs(perf.policy.slow_ms)}`}
          />
          <Term
            label="Stop at"
            value={`±${(perf.policy.ci_target * 100).toFixed(0)}% (95% CI) or ${perf.policy.max_seconds} s`}
          />
        </dl>
        <ul className="space-y-1 text-sm">
          {Object.entries(perf.methods).map(([method, words]) => (
            <li key={method}>
              <span className="font-medium">
                {METHOD_LABELS[method as FitMethod] ?? method.replace("_", " ")}
              </span>
              : <span className="text-muted-foreground">{words}</span>
            </li>
          ))}
        </ul>
        {samples ? (
          <a
            href={source.url(runId, SAMPLES)}
            download
            className="inline-flex items-center gap-1 text-sm underline underline-offset-3"
          >
            <Download aria-hidden="true" className="size-4" /> Every sample
            {samples.rows !== undefined ? ` (${formatCount(samples.rows)} rows)` : ""}
          </a>
        ) : null}
      </PageSection>
    </div>
  )
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  )
}

function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max((value / max) * 100, 1) : 0
  return (
    <div className="h-2 w-full min-w-16 rounded-sm bg-muted" aria-hidden="true">
      <div className="h-2 rounded-sm bg-primary" style={{ width: `${width}%` }} />
    </div>
  )
}

/** The write-up's reason for leaving peak memory out, when the run records one peak for all. */
function PeakMemoryNote({ perf }: { perf: PerfSummaryV1 }) {
  const peak = uniformPeakMemory(perf)
  if (peak === null) return null
  return (
    <Alert data-state="uniform-peak-memory" className="mt-3">
      <TriangleAlert />
      <AlertTitle>{PEAK_MEMORY_NOTE.title}</AlertTitle>
      <AlertDescription>
        <p>
          {PEAK_MEMORY_NOTE.text} The recorded figure is {formatBytes(peak)}. Words from{" "}
          <a
            href={sourceUrl(PEAK_MEMORY_NOTE.citation.file)}
            rel="noreferrer"
            className="underline underline-offset-3"
          >
            {PEAK_MEMORY_NOTE.citation.file}
          </a>
          , {PEAK_MEMORY_NOTE.citation.section}.
        </p>
      </AlertDescription>
    </Alert>
  )
}

function StartupTable({ perf }: { perf: PerfSummaryV1 }) {
  const rows = orderAdapters(perf.startup.map((entry) => entry.adapter ?? "")).map((adapter) =>
    perf.startup.find((entry) => entry.adapter === adapter)!,
  )
  const max = Math.max(...rows.map((row) => row.p50_ms ?? 0))
  return (
    <TableRegion label="Startup table">
      <Table>
        <TableCaption className="sr-only">
          Per adapter: the p50 with p95 and p99, the samples, the 95% interval&apos;s half-width and
          whether it met its target, and the peak resident memory.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Adapter</TableHead>
            <TableHead className="text-right">p50</TableHead>
            <TableHead className="w-32" aria-hidden="true" />
            <TableHead className="text-right">p95 · p99</TableHead>
            <TableHead className="text-right">Samples</TableHead>
            <TableHead className="text-right">95% CI</TableHead>
            <TableHead className="text-right">Peak RSS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.adapter} data-adapter={row.adapter}>
              <TableCell>
                <AdapterMark adapter={row.adapter ?? ""} />
              </TableCell>
              <TableCell className="tabular text-right">
                {row.p50_ms === undefined ? "—" : formatMs(row.p50_ms)}
              </TableCell>
              <TableCell>
                <Bar value={row.p50_ms ?? 0} max={max} />
              </TableCell>
              <TableCell className="tabular text-right text-muted-foreground">
                {row.p95_ms === undefined ? "—" : formatMs(row.p95_ms)} ·{" "}
                {row.p99_ms === undefined ? "—" : formatMs(row.p99_ms)}
              </TableCell>
              <TableCell className="tabular text-right">{formatCount(row.samples)}</TableCell>
              <TableCell className="tabular text-right">
                {row.ci95_halfwidth_ms == null ? "—" : `±${formatMs(row.ci95_halfwidth_ms)}`}
                {row.ci_met === false ? (
                  <span className="block text-xs text-warning">target not met</span>
                ) : null}
              </TableCell>
              <TableCell className="tabular text-right">
                {row.rss_peak_bytes == null ? "—" : formatBytes(row.rss_peak_bytes)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableRegion>
  )
}

function Scaling({ perf }: { perf: PerfSummaryV1 }) {
  const [url, setUrl] = useUrlState(perfParams)
  const labels = useMemo(() => fitLabels(perf), [perf])
  const label = url.label && labels.includes(url.label) ? url.label : (labels[0] ?? "")
  const series: FitSeries = url.series ?? "diagonal"
  const method: FitMethod = url.method ?? "inprocess"
  const panels = useMemo(
    () => scalingPanels(perf, { label, series, method }),
    [perf, label, series, method],
  )
  const variable = series === "tokens" ? "tokens" : "candidates"
  return (
    <PageSection
      title="Scaling"
      id="scaling"
      description={`Time against size, one panel per shape: ${SERIES_WORDS[series]}, timed ${METHOD_LABELS[method]}, at the budget ${label}. An exponent near 1 is linear; near 2, fitting re-counts the payload per reduction.`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={label} onValueChange={(value) => setUrl({ label: value })}>
            <SelectTrigger size="sm" className="w-32" aria-label="Budget">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {labels.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  {entry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={series} onValueChange={(value) => setUrl({ series: value as FitSeries })}>
            <SelectTrigger size="sm" className="w-36" aria-label="Series">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIT_SERIES.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  {entry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={method} onValueChange={(value) => setUrl({ method: value as FitMethod })}>
            <SelectTrigger size="sm" className="w-32" aria-label="Method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIT_METHODS.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  {METHOD_LABELS[entry]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {panels.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fit at this budget, series and method.</p>
      ) : (
        <ScalingPlots panels={panels} variable={variable} method={METHOD_LABELS[method]} />
      )}
    </PageSection>
  )
}

function ThroughputTable({ perf }: { perf: PerfSummaryV1 }) {
  const order = orderAdapters([...new Set(perf.throughput.map((row) => row.adapter))])
  const rows = [...perf.throughput].sort(
    (a, b) => order.indexOf(a.adapter) - order.indexOf(b.adapter) || a.concurrency - b.concurrency,
  )
  const max = Math.max(...rows.map((row) => row.per_second ?? 0))
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No throughput was measured.</p>
  }
  const cell = rows[0]!
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {cell.cell.shape}, {formatCount(cell.cell.candidates)} ×{" "}
        {formatCount(cell.cell.candidate_tokens)} at {cell.label}.
      </p>
      <TableRegion label="Throughput table">
        <Table>
          <TableCaption className="sr-only">
            Per adapter and concurrency: invocations per second, invocations and seconds, and the
            outcomes.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Adapter</TableHead>
              <TableHead className="text-right">Concurrency</TableHead>
              <TableHead className="text-right">Per second</TableHead>
              <TableHead className="w-28" aria-hidden="true" />
              <TableHead className="text-right">Invocations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.adapter}|${row.concurrency}`}>
                <TableCell>
                  <AdapterMark adapter={row.adapter} />
                </TableCell>
                <TableCell className="tabular text-right">{formatCount(row.concurrency)}</TableCell>
                <TableCell className="tabular text-right">
                  {row.per_second === null ? "—" : row.per_second.toFixed(1)}
                </TableCell>
                <TableCell>
                  <Bar value={row.per_second ?? 0} max={max} />
                </TableCell>
                <TableCell className="tabular text-right">
                  {formatCount(row.invocations)} in {row.seconds.toFixed(1)} s
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRegion>
    </div>
  )
}

function RefusalTable({ perf }: { perf: PerfSummaryV1 }) {
  const adapters = orderAdapters(perf.time_to_refusal.map((row) => row.adapter))
  const rows = adapters.map((adapter) =>
    perf.time_to_refusal.find((row) => row.adapter === adapter)!,
  )
  const max = Math.max(...rows.map((row) => row.p50_ms))
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No cell was refused.</p>
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        The median end-to-end p50 over the cells each adapter refused.
      </p>
      <TableRegion label="Time to refusal table">
        <Table>
          <TableCaption className="sr-only">
            Per adapter: the median p50 of its refused cells, and how many cells.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Adapter</TableHead>
              <TableHead className="text-right">p50</TableHead>
              <TableHead className="w-28" aria-hidden="true" />
              <TableHead className="text-right">Cells</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.adapter}>
                <TableCell>
                  <AdapterMark adapter={row.adapter} />
                </TableCell>
                <TableCell className="tabular text-right">{formatMs(row.p50_ms)}</TableCell>
                <TableCell>
                  <Bar value={row.p50_ms} max={max} />
                </TableCell>
                <TableCell className="tabular text-right">{formatCount(row.cells)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRegion>
    </div>
  )
}

function Cells({ perf }: { perf: PerfSummaryV1 }) {
  const [url, setUrl] = useUrlState(perfParams)
  const adapters = useMemo(
    () => orderAdapters([...new Set(perf.cells.map((cell) => cell.adapter))]),
    [perf],
  )
  const shapes = useMemo(() => [...new Set(perf.cells.map((cell) => cell.cell.shape))], [perf])
  const statuses = useMemo(() => [...new Set(perf.cells.map((cell) => cell.status))], [perf])
  const filter = { adapter: url.adapter, shape: url.shape, status: url.status }
  const matched = filterCells(perf.cells, filter)
  const pages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE))
  const page = Math.min(url.page ?? 1, pages)
  const shown = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const choose = (
    key: "adapter" | "shape" | "status",
    values: readonly string[],
    current: string | undefined,
    words: string,
    name: (value: string) => string = (value) => value,
  ) => (
    <Select
      value={current && values.includes(current) ? current : ALL}
      onValueChange={(value) =>
        setUrl({ [key]: value === ALL ? undefined : value, page: undefined })
      }
    >
      <SelectTrigger size="sm" className="w-40" aria-label={`Filter cells by ${words}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Every {words}</SelectItem>
        {values.map((value) => (
          <SelectItem key={value} value={value}>
            {name(value)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
  return (
    <PageSection
      title="Cells"
      id="cells"
      description="Every adapter, shape, size and budget measured: each method's p50 with its samples and interval, and a skipped cell's reason."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {choose("adapter", adapters, url.adapter, "adapter", adapterLabel)}
          {choose("shape", shapes, url.shape, "shape")}
          {choose("status", statuses, url.status, "status")}
        </div>
      }
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {formatCount(matched.length)} of {formatCount(perf.cells.length)} cells
        {pages > 1 ? `, page ${formatCount(page)} of ${formatCount(pages)}` : ""}.
      </p>
      <TableRegion label="Performance cells table">
        <Table>
          <TableCaption className="sr-only">
            One row per measured cell: adapter, shape, size, budget, outcome and status, and the
            end-to-end, net and in-process p50s.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Adapter</TableHead>
              <TableHead>Shape</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">End to end</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">In-process</TableHead>
              <TableHead className="text-right">Peak RSS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((cell, i) => (
              <CellRow
                key={`${cell.adapter}|${cell.cell.shape}|${cell.cell.candidates}|${cell.cell.candidate_tokens}|${cell.label}|${i}`}
                cell={cell}
              />
            ))}
          </TableBody>
        </Table>
      </TableRegion>
      {pages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setUrl({ page: page - 1 === 1 ? undefined : page - 1 })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setUrl({ page: page + 1 })}
          >
            Next
          </Button>
        </div>
      ) : null}
    </PageSection>
  )
}

function Timing({
  stats,
}: {
  stats: {
    samples: number
    p50_ms?: number
    ci95_halfwidth_ms?: number | null
    error?: string | null
  } | null
}) {
  if (!stats) return <>—</>
  if (stats.error) return <span className="text-xs text-warning">{stats.error}</span>
  if (stats.p50_ms === undefined) return <>—</>
  return (
    <>
      {formatMs(stats.p50_ms)}
      <span className="block text-xs text-muted-foreground">
        n {formatCount(stats.samples)}
        {stats.ci95_halfwidth_ms != null ? ` · ±${formatMs(stats.ci95_halfwidth_ms)}` : ""}
      </span>
    </>
  )
}

function CellRow({ cell }: { cell: PerfCell }) {
  return (
    <TableRow data-cell-status={cell.status}>
      <TableCell>
        <AdapterMark adapter={cell.adapter} />
      </TableCell>
      <TableCell className="text-xs">{cell.cell.shape}</TableCell>
      <TableCell className="tabular text-right text-xs">
        {formatCount(cell.cell.candidates)} × {formatCount(cell.cell.candidate_tokens)}
      </TableCell>
      <TableCell className="text-xs">
        {cell.label}
        {cell.budget_input !== null ? (
          <span className="tabular block text-muted-foreground">
            {formatCount(cell.budget_input)}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="text-xs">
        {cell.status === "measured" ? (
          cell.outcome ? (
            <Outcome value={cell.outcome} />
          ) : (
            "measured"
          )
        ) : (
          <>
            <StatusBadge
              status={cell.status === "skipped" ? "na" : "warning"}
              label={cell.status}
            />
            {cell.skipped_reason ? (
              <span className="block text-muted-foreground">{cell.skipped_reason}</span>
            ) : null}
          </>
        )}
      </TableCell>
      <TableCell className="tabular text-right">
        <Timing stats={cell.e2e} />
      </TableCell>
      <TableCell className="tabular text-right">
        {cell.net_p50_ms === null ? "—" : formatMs(cell.net_p50_ms)}
      </TableCell>
      <TableCell className="tabular text-right">
        <Timing stats={cell.inprocess} />
      </TableCell>
      <TableCell className="tabular text-right text-xs">
        {cell.rss_peak_bytes === null ? "—" : formatBytes(cell.rss_peak_bytes)}
      </TableCell>
    </TableRow>
  )
}
