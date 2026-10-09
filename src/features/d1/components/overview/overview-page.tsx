// The Domain 1 overview (ui-plan.md 8.1; DESIGN.md 4.5): the claim, the evidence, how far to
// trust it, the drill-down, over the composite latest (5.5). Every panel names the run it reads.

import { Link } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { domainById, sourceUrl, TRUST, TRUST_CITATION } from "@/content"
import { useRunDocument, useRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { RunsIndexV1, SummaryV1 } from "@/data/schema/generated"
import { useSweep } from "@/data/use-sweep"
import {
  nightlyCandidates,
  resolveComposite,
  s7Candidates,
  SCALE_SUITE,
  type Composite,
} from "@/features/d1/model/composite"
import {
  headlineMetrics,
  reasonsExercised,
  ungatedSummarizerMetrics,
  type MetricSource,
} from "@/features/d1/model/overview"
import { fileByPath, sortedSuites } from "@/features/d1/model/run"
import { suiteEntry } from "@/features/d1/model/suite"
import { sweepFiles, walkTimelinePath } from "@/features/d1/model/sweep-curve"
import { overviewParams } from "@/features/d1/model/url"
import { formatCount } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { EnvironmentDiagram } from "../diagrams/environment-diagram"
import { OraclesDiagram } from "../diagrams/oracles-diagram"
import { PipelineWalk } from "../pipeline-walk"
import { MatrixTable, type MatrixSource } from "../run-matrix"
import { DefectsTable } from "./defects-table"
import { ExponentsTable } from "./exponents-table"
import { FindingsSummary } from "./findings-summary"
import { HeadlineCard, HeadlineGroups } from "./headline-cards"
import { SignatureCurve } from "./signature-curve"
import { StatusLine } from "./status-line"

const domain = domainById("d1")

export function OverviewPage() {
  const runsIndex = useRunsIndex()
  const [params, setParams] = useUrlState(overviewParams)
  const indexRegion = regionOfDocument(runsIndex, "d1/index.json", "the runs index")
  return (
    <DashboardPage
      title="Domain 1 · Assembly determinism, budgeting and traceability"
      description={domain?.claim}
      width="wide"
      filters={
        runsIndex.data?.ok ? (
          <RunPickers
            index={runsIndex.data.document}
            composite={resolveComposite(runsIndex.data.document, params)}
            onChange={setParams}
          />
        ) : null
      }
    >
      <DataRegion
        state={indexRegion}
        label="the runs index"
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        {(index) => <Overview composite={resolveComposite(index, params)} />}
      </DataRegion>
    </DashboardPage>
  )
}

function RunPickers({
  index,
  composite,
  onChange,
}: {
  index: RunsIndexV1
  composite: Composite
  onChange: (patch: { nightly?: string | undefined; s7?: string | undefined }) => void
}) {
  const nightlies = nightlyCandidates(index)
  const s7s = s7Candidates(index)
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Composite runs">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Nightly run</span>
        <Select
          value={composite.nightly?.run.run_id ?? ""}
          onValueChange={(value) => onChange({ nightly: value })}
          disabled={nightlies.length === 0}
        >
          <SelectTrigger size="sm" aria-label="Nightly run" className="w-72 font-mono text-xs">
            <SelectValue placeholder="no finished nightly run" />
          </SelectTrigger>
          <SelectContent>
            {nightlies.map((run) => (
              <SelectItem key={run.run_id} value={run.run_id} className="font-mono text-xs">
                {run.run_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">S7 run</span>
        <Select
          value={composite.s7?.run.run_id ?? ""}
          onValueChange={(value) => onChange({ s7: value })}
          disabled={s7s.length === 0}
        >
          <SelectTrigger size="sm" aria-label="S7 run" className="w-72 font-mono text-xs">
            <SelectValue placeholder="no run with S7" />
          </SelectTrigger>
          <SelectContent>
            {s7s.map((run) => (
              <SelectItem key={run.run_id} value={run.run_id} className="font-mono text-xs">
                {run.run_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      {composite.nightly?.from === "url" || composite.s7?.from === "url" ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ nightly: undefined, s7: undefined })}
        >
          Back to the newest
        </Button>
      ) : null}
    </div>
  )
}

function Overview({ composite }: { composite: Composite }) {
  const nightlyId = composite.nightly?.run.run_id
  const s7Id = composite.s7?.run.run_id

  // Each run's own index.json is the gate: a 404 is the pruned state, and its file list decides
  // which panels are "not in this run" before anything else is fetched.
  const nightlyIndex = useRunDocument(nightlyId, "index.json", "run-index")
  const s7Index = useRunDocument(s7Id, "index.json", "run-index")
  const nightlyFiles = nightlyIndex.data?.ok ? nightlyIndex.data.document : undefined
  const s7Files = s7Index.data?.ok ? s7Index.data.document : undefined

  const nightlySummary = useRunDocument(nightlyId, "summary.json", "summary", {
    enabled: nightlyFiles !== undefined,
  })
  const s7Summary = useRunDocument(s7Id, "summary.json", "summary", {
    enabled: s7Files !== undefined,
  })
  const manifest = useRunDocument(nightlyId, "manifest.json", "manifest", {
    enabled: nightlyFiles !== undefined,
  })
  const ciListed = nightlyFiles ? fileByPath(nightlyFiles, "ci.json") !== undefined : false
  const ci = useRunDocument(nightlyId, "ci.json", "ci-report", { enabled: ciListed })
  const coverage = useRunDocument(nightlyId, "coverage.json", "coverage", {
    enabled: nightlyFiles !== undefined,
  })
  const nightlyDoc: SummaryV1 | undefined = nightlySummary.data?.ok
    ? nightlySummary.data.document
    : undefined
  const s7Doc: SummaryV1 | undefined = s7Summary.data?.ok ? s7Summary.data.document : undefined
  const s2Entry = nightlyDoc ? suiteEntry(nightlyDoc, "S2") : undefined
  const s2 = useRunDocument(
    nightlyId,
    s2Entry?.summary ?? "suites/S2/summary.json",
    "suite-summary",
    {
      enabled: s2Entry !== undefined,
    },
  )
  const perfListed = s7Files ? fileByPath(s7Files, "perf/summary.json") !== undefined : false
  const perf = useRunDocument(s7Id, "perf/summary.json", "perf-summary", { enabled: perfListed })
  const sweepFile = s7Files ? sweepFiles(s7Files)[0] : undefined
  const sweep = useSweep(s7Id, sweepFile?.path, { enabled: sweepFile !== undefined })
  const walkPath = s7Files
    ? walkTimelinePath(s7Files, sweep.status === "ready" ? sweep.summary : undefined)
    : undefined
  const timeline = useRunDocument(s7Id, walkPath ?? "timeline", "timeline", {
    enabled: walkPath !== undefined,
  })

  const sources: MetricSource[] = [
    ...(nightlyId && nightlyDoc ? [{ runId: nightlyId, summary: nightlyDoc }] : []),
    ...(s7Id && s7Doc ? [{ runId: s7Id, summary: s7Doc }] : []),
  ]
  const missingNote = (suite: string) =>
    suite === SCALE_SUITE && !s7Id
      ? "Measured by S7, which no run in the index has."
      : `Measured by ${suite}, which the loaded runs do not carry.`

  const noS7: RegionState<never> = { status: "absent", what: "S7" }
  const s7Absent = (what: string): RegionState<never> => ({ status: "absent", what })

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10">
      {composite.unknown.nightly || composite.unknown.s7 ? (
        <Alert data-state="unknown-run">
          <AlertTitle>The address names a run the index does not list</AlertTitle>
          <AlertDescription>
            {[composite.unknown.nightly, composite.unknown.s7].filter(Boolean).map((id) => (
              <span key={id} className="font-mono">
                {id}{" "}
              </span>
            ))}
            The index's own choice is shown instead.
          </AlertDescription>
        </Alert>
      ) : null}

      <PageSection
        id="claim"
        title="The claim"
        description="What Domain 1 is designed to establish about CWA, and the record it rests on."
      >
        <p className="max-w-prose text-lg leading-snug font-medium">{domain?.claim}</p>
        {!composite.nightly ? (
          <Alert data-state="no-nightly">
            <AlertTitle>No nightly run yet</AlertTitle>
            <AlertDescription>
              The index lists no finished run of the nightly profile. Every panel below that reads
              the nightly says so;{" "}
              <Link to="/d1/runs" className="underline underline-offset-3">
                the runs list
              </Link>{" "}
              has what exists.
            </AlertDescription>
          </Alert>
        ) : null}
        {nightlyId && nightlyIndex.isError && nightlyIndex.error.kind === "not-found" ? (
          <DataRegion
            state={{ status: "not-found", what: `Run ${nightlyId}` }}
            label="the nightly run"
          >
            {() => null}
          </DataRegion>
        ) : null}
        {s7Id && s7Index.isError && s7Index.error.kind === "not-found" ? (
          <DataRegion state={{ status: "not-found", what: `Run ${s7Id}` }} label="the S7 run">
            {() => null}
          </DataRegion>
        ) : null}
        <StatusLine
          nightly={composite.nightly?.run}
          s7={composite.s7?.run}
          manifest={nightlyFiles ? manifest : undefined}
          ci={ciListed ? ci : undefined}
        />
      </PageSection>

      <PageSection
        id="evidence"
        title="The evidence"
        description="The headline metrics as the harness judged them, then the signature pictures. Each names its run."
      >
        <div className="grid gap-8">
          <HeadlineRegion
            nightly={
              nightlyId
                ? { id: nightlyId, query: nightlySummary, gated: nightlyFiles !== undefined }
                : undefined
            }
            s7={s7Id ? { id: s7Id, query: s7Summary, gated: s7Files !== undefined } : undefined}
            sources={sources}
            missingNote={missingNote}
          />
          <section aria-labelledby="coverage-heading" data-headline-group="coverage">
            <h3 id="coverage-heading" className="mb-2 text-sm font-medium">
              Coverage
            </h3>
            {nightlyId && nightlyFiles ? (
              <DataRegion
                state={regionOfDocument(coverage, `${nightlyId}/coverage.json`, "coverage")}
                label="coverage"
                skeleton={<Skeleton className="h-24 w-full max-w-sm" />}
              >
                {(document) => {
                  const reasons = reasonsExercised(document)
                  return (
                    <Card className="max-w-sm gap-2 py-4" data-metric="coverage.reasons">
                      <CardHeader className="px-4">
                        <CardTitle className="text-sm font-medium">
                          Reason codes exercised
                        </CardTitle>
                        <CardDescription className="font-mono text-xs">
                          coverage.json · run {nightlyId}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-4">
                        <p className="tabular text-2xl font-semibold tracking-tight">
                          {formatCount(reasons.exercised)}{" "}
                          <span className="text-base font-normal text-muted-foreground">
                            of {formatCount(reasons.total)}
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Reason codes of the contract that at least one adapter exercised. A count,
                          not a judgment.{" "}
                          {reasons.unknown > 0
                            ? `${formatCount(reasons.unknown)} reason codes in the answers are not in the contract. `
                            : ""}
                          <Link
                            to={`/d1/runs/${nightlyId}/coverage`}
                            className="underline underline-offset-3"
                          >
                            Every requirement, reason and tag
                          </Link>
                          .
                        </p>
                      </CardContent>
                    </Card>
                  )
                }}
              </DataRegion>
            ) : (
              <DataRegion state={s7Absent("Coverage")} label="coverage">
                {() => null}
              </DataRegion>
            )}
          </section>

          <section aria-labelledby="curve-heading" className="space-y-3">
            <h3 id="curve-heading" className="text-sm font-medium">
              One sweep, from full size to refusal
            </h3>
            {s7Id && s7Files && sweepFile ? (
              <SignatureCurve runId={s7Id} file={sweepFile} handle={sweep} />
            ) : s7Id && s7Files ? (
              <DataRegion state={s7Absent("A budget sweep")} label="the sweep">
                {() => null}
              </DataRegion>
            ) : s7Id && s7Index.isPending ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <DataRegion state={noS7} label="the sweep">
                {() => null}
              </DataRegion>
            )}
          </section>

          <section aria-labelledby="walk-heading" className="space-y-3">
            <h3 id="walk-heading" className="text-sm font-medium">
              One assembly, stage by stage
            </h3>
            {s7Id && s7Files && walkPath ? (
              <DataRegion
                state={regionOfDocument(timeline, `${s7Id}/${walkPath}`, "The timeline")}
                label="the timeline"
                skeleton={<Skeleton className="h-72 w-full" />}
              >
                {(document) => <PipelineWalk timeline={document} runId={s7Id} path={walkPath} />}
              </DataRegion>
            ) : s7Id && s7Files ? (
              <DataRegion state={s7Absent("A timeline")} label="the timeline">
                {() => null}
              </DataRegion>
            ) : s7Id && s7Index.isPending ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <DataRegion state={noS7} label="the timeline">
                {() => null}
              </DataRegion>
            )}
          </section>

          <section aria-labelledby="matrix-heading" className="space-y-3">
            <h3 id="matrix-heading" className="text-sm font-medium">
              Every suite, every adapter
            </h3>
            <CompositeMatrix
              nightly={
                nightlyId && nightlyDoc ? { runId: nightlyId, summary: nightlyDoc } : undefined
              }
              s7={s7Id && s7Doc ? { runId: s7Id, summary: s7Doc } : undefined}
              pending={nightlySummary.isPending && nightlyFiles !== undefined}
            />
          </section>

          <section aria-labelledby="exponents-heading" className="space-y-3">
            <h3 id="exponents-heading" className="text-sm font-medium">
              The cost of budget pressure
            </h3>
            {s7Id && perfListed ? (
              <DataRegion
                state={regionOfDocument(
                  perf,
                  `${s7Id}/perf/summary.json`,
                  "the performance summary",
                )}
                label="the performance summary"
                skeleton={<Skeleton className="h-40 w-full" />}
              >
                {(document) => <ExponentsTable perf={document} runId={s7Id} />}
              </DataRegion>
            ) : s7Id && s7Files ? (
              <DataRegion state={s7Absent("A performance summary")} label="the performance summary">
                {() => null}
              </DataRegion>
            ) : s7Id && s7Index.isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <DataRegion state={noS7} label="the performance summary">
                {() => null}
              </DataRegion>
            )}
          </section>

          {nightlyId && s2Entry ? (
            <DataRegion
              state={regionOfDocument(s2, `${nightlyId}/${s2Entry.summary}`, "the S2 summary")}
              label="the S2 summary"
              skeleton={<Skeleton className="h-64 w-full" />}
            >
              {(document) => (
                <EnvironmentDiagram cells={document.cells ?? []} runId={nightlyId} suite="S2" />
              )}
            </DataRegion>
          ) : null}
        </div>
      </PageSection>

      <PageSection
        id="trust"
        title="How far to trust it"
        description="The checks the evidence itself passed, and what it does not show."
      >
        <div className="grid gap-6">
          {nightlyId && nightlyDoc ? (
            <OraclesDiagram
              metrics={nightlyDoc.metrics.filter((metric) => metric.suite === "S0")}
              runId={nightlyId}
            />
          ) : nightlyId && nightlySummary.isPending ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <DataRegion state={s7Absent("The oracle self-check")} label="the self-check">
              {() => null}
            </DataRegion>
          )}
          <ul className="grid gap-3 md:grid-cols-2" data-trust>
            {TRUST.map((note) => (
              <li key={note.id} className="rounded-lg border p-4 text-sm">
                <h3 className="font-medium">{note.title}</h3>
                <p className="mt-1 text-muted-foreground">{note.text}</p>
                {note.details ? (
                  <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                    {note.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Words from{" "}
            <a
              href={sourceUrl(TRUST_CITATION.file)}
              rel="noreferrer"
              className="underline underline-offset-3"
            >
              {TRUST_CITATION.file}
            </a>
            , {TRUST_CITATION.section}.
          </p>
        </div>
      </PageSection>

      <PageSection
        id="drill-down"
        title="The drill-down"
        description="Every number behind this page, and the defects the benchmark found on the way."
      >
        <div className="grid gap-6">
          <div className="grid gap-3 md:grid-cols-2">
            {nightlyId && nightlyDoc && nightlyFiles ? (
              <FindingsSummary
                runId={nightlyId}
                summary={nightlyDoc}
                index={nightlyFiles}
                label="nightly"
              />
            ) : nightlyId && nightlySummary.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : null}
            {s7Id && s7Doc && s7Files ? (
              <FindingsSummary runId={s7Id} summary={s7Doc} index={s7Files} label="S7" />
            ) : s7Id && s7Summary.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : null}
          </div>
          <DefectsTable />
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm" data-links>
            <li>
              <Link to="/d1/runs" className="underline underline-offset-3">
                Every run
              </Link>
            </li>
            {nightlyId ? (
              <li>
                <Link
                  to={`/d1/runs/${nightlyId}/coverage`}
                  className="underline underline-offset-3"
                >
                  Coverage of the nightly
                </Link>
              </li>
            ) : null}
            {s7Id ? (
              <>
                <li>
                  <Link to={`/d1/runs/${s7Id}/perf`} className="underline underline-offset-3">
                    Performance of the S7 run
                  </Link>
                </li>
                <li>
                  <Link to={`/d1/runs/${s7Id}/sweeps`} className="underline underline-offset-3">
                    Every sweep of the S7 run
                  </Link>
                </li>
              </>
            ) : null}
            {domain?.writeUp ? (
              <li>
                <a
                  href={sourceUrl(domain.writeUp.file)}
                  rel="noreferrer"
                  className="underline underline-offset-3"
                >
                  The write-up
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </PageSection>
    </div>
  )
}

type SummaryQuery = ReturnType<typeof useRunDocument<"summary">>

function HeadlineRegion({
  nightly,
  s7,
  sources,
  missingNote,
}: {
  nightly: { id: string; query: SummaryQuery; gated: boolean } | undefined
  s7: { id: string; query: SummaryQuery; gated: boolean } | undefined
  sources: MetricSource[]
  missingNote: (suite: string) => string
}) {
  // A summary that failed to parse is reported once, above the cards drawn from the rest.
  const problems = [nightly, s7].flatMap((run) => {
    if (!run || !run.gated || run.query.isPending) return []
    const region = regionOfDocument(run.query, `${run.id}/summary.json`, "the summary")
    return region.status === "ok" ? [] : [{ id: run.id, region }]
  })
  const pending = (nightly?.gated && nightly.query.isPending) || (s7?.gated && s7.query.isPending)
  if (sources.length === 0 && pending) {
    return <Skeleton className="h-64 w-full" aria-label="Loading the headline metrics" />
  }
  const groups = headlineMetrics(sources)
  const ungated = ungatedSummarizerMetrics(sources)
  return (
    <div className="space-y-6">
      {problems.map(({ id, region }) => (
        <DataRegion key={id} state={region} label={`the summary of ${id}`}>
          {() => null}
        </DataRegion>
      ))}
      {sources.length === 0 ? (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          No summary to read the headline metrics from.
        </p>
      ) : (
        <>
          <HeadlineGroups groups={groups} missingNote={missingNote} />
          <section aria-labelledby="headline-ungated" data-headline-group="ungated">
            <h3 id="headline-ungated" className="mb-1 text-sm font-medium">
              The summarizer, measured but not gated
            </h3>
            <p className="mb-2 text-xs text-muted-foreground">
              S11 measures the optional LLM summarizer and judges none of it: these have no target
              and no pass.
            </p>
            {ungated.length === 0 ? (
              <p
                className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
                data-state="empty"
              >
                The loaded runs carry no summarizer metrics.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {ungated.map((metric) => (
                  <HeadlineCard key={metric.id} metric={metric} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function CompositeMatrix({
  nightly,
  s7,
  pending,
}: {
  nightly: { runId: string; summary: SummaryV1 } | undefined
  s7: { runId: string; summary: SummaryV1 } | undefined
  pending: boolean
}) {
  if (!nightly && !s7) {
    if (pending) return <Skeleton className="h-64 w-full" aria-label="Loading the matrix" />
    return (
      <p
        className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        data-state="empty"
      >
        No summary to draw the matrix from.
      </p>
    )
  }
  const sources: MatrixSource[] = []
  if (nightly) {
    sources.push({
      runId: nightly.runId,
      summary: nightly.summary,
      suites: sortedSuites(nightly.summary).filter((suite) => suite.id !== SCALE_SUITE || !s7),
    })
  }
  if (s7) {
    const entry = suiteEntry(s7.summary, SCALE_SUITE)
    if (entry)
      sources.push({ runId: s7.runId, summary: s7.summary, suites: [entry], labelRun: true })
  }
  return (
    <div className="space-y-2">
      <MatrixTable sources={sources} />
      <p className="text-xs text-muted-foreground">
        {nightly ? (
          <>
            Suites from run <span className="font-mono">{nightly.runId}</span>
          </>
        ) : null}
        {nightly && s7 ? "; " : ""}
        {s7 ? (
          <>
            S7 from run <span className="font-mono">{s7.runId}</span>, labeled in its row
          </>
        ) : null}
        . A cell opens the suite.
      </p>
    </div>
  )
}
