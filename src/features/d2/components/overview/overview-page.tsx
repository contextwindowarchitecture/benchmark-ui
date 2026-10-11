// The Domain 2 overview (the UI-D2 plan; ui-plan.md 7.1; DESIGN.md 4.5): the claim, the evidence,
// how far to trust it, the drill-down, over the composite of the runs each suite is read from.
// Every panel names its run and the scripts' size; words come from the content files, numbers
// from the records.

import type { ReactNode } from "react"
import { Link } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { domainById, sourceUrl } from "@/content"
import { CONCLUSION, CONCLUSIONS, CONCLUSIONS_CITATION, QUESTION } from "@/content/d2/trust"
import { suiteWords } from "@/content/d2/vocabulary"
import { useDocumentsOfRuns, useDomainRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { D2RunsIndexV1, D2SummaryV1 } from "@/data/schema/generated"
import { isFinished } from "@/features/d1/model/runs"
import { armBlocks, type ArmBlocks } from "@/features/d2/model/blocks"
import { composite, type Composite } from "@/features/d2/model/composite"
import { headlineBudget, type D2Metric } from "@/features/d2/model/metrics"
import { checks, type CheckSource } from "@/features/d2/model/overview"
import { d2OverviewParams } from "@/features/d2/model/url"
import { formatUtc, isoUtc } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { ArmLegend } from "../arm-label"
import {
  AptitudePanel,
  AttributionPanel,
  CostPanel,
  LongContextPairedPanel,
  LongContextPanel,
  LoopPanel,
  PairedPanel,
  UnreliabilityPanel,
  type PanelSource,
} from "./evidence-panels"
import { ChecksGrid, TrustNotes } from "./trust-section"

const domain = domainById("d2")

export function D2OverviewPage() {
  const runsIndex = useDomainRunsIndex("d2")
  const [params, setParams] = useUrlState(d2OverviewParams)
  const region = regionOfDocument(runsIndex, "d2/index.json", "the runs index")
  return (
    <DashboardPage
      title={`Domain 2 · ${domain?.title ?? "Long-horizon multi-turn stability"}`}
      description={domain?.claim}
      width="wide"
      filters={
        runsIndex.data?.ok ? (
          <RunPin
            index={runsIndex.data.document}
            pinned={params.run}
            onChange={(run) => setParams({ run })}
          />
        ) : null
      }
    >
      <DataRegion
        state={region}
        label="the runs index"
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        {(index) => <Overview view={composite(index, params.run)} />}
      </DataRegion>
    </DashboardPage>
  )
}

const BY_SUITE = "by-suite"

function RunPin({
  index,
  pinned,
  onChange,
}: {
  index: D2RunsIndexV1
  pinned: string | undefined
  onChange: (run: string | undefined) => void
}) {
  const runs = index.runs.filter(isFinished)
  return (
    <div
      className="flex max-w-full min-w-0 flex-wrap items-center gap-3"
      role="group"
      aria-label="Runs read"
    >
      <label className="flex max-w-full min-w-0 items-center gap-2 text-sm">
        <span className="text-muted-foreground">Read</span>
        <Select
          value={pinned && runs.some((run) => run.run_id === pinned) ? pinned : BY_SUITE}
          onValueChange={(value) => onChange(value === BY_SUITE ? undefined : value)}
        >
          <SelectTrigger
            size="sm"
            aria-label="Run to read"
            className="w-80 max-w-full min-w-0 font-mono text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BY_SUITE} className="text-xs">
              each suite's newest reported run
            </SelectItem>
            {runs.map((run) => (
              <SelectItem key={run.run_id} value={run.run_id} className="font-mono text-xs">
                {run.run_id}
                {run.ci_profile ? ` · ${run.ci_profile}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      {pinned ? (
        <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
          Reset
        </Button>
      ) : null}
    </div>
  )
}

function Overview({ view }: { view: Composite }) {
  const runIds = view.runs.map((run) => run.run_id)
  const summaries = useDocumentsOfRuns(
    runIds.map((runId) => ({ runId, path: "summary.json" })),
    "d2/summary",
  )
  const indexes = useDocumentsOfRuns(
    runIds.map((runId) => ({ runId, path: "index.json" })),
    "d2/run-index",
  )
  // The scripts' size, from one of the run's script indexes: the run sets it for every family.
  const sizePaths = runIds.map((runId, i) => {
    const files = indexes[i]?.data?.ok ? indexes[i].data.document.files : []
    const file = files.find((f) => f.kind === "conversation-index" || f.kind === "lq-index")
    return file ? { runId, path: file.path } : null
  })
  const conversationIndexes = useDocumentsOfRuns(
    sizePaths.flatMap((entry) => (entry && !entry.path.includes("/lq/") ? [entry] : [])),
    "d2/conversation-index",
  )
  const lqIndexes = useDocumentsOfRuns(
    sizePaths.flatMap((entry) => (entry && entry.path.includes("/lq/") ? [entry] : [])),
    "d2/lq-index",
  )
  const sizes = new Map<string, string>()
  for (const query of [...conversationIndexes, ...lqIndexes]) {
    if (query.data?.ok) sizes.set(query.data.document.run_id, query.data.document.size)
  }

  const summaryOf = new Map<string, D2SummaryV1>()
  runIds.forEach((runId, i) => {
    const query = summaries[i]
    if (query?.data?.ok) summaryOf.set(runId, query.data.document)
  })
  const pending = summaries.some((query) => query.isPending)

  // The suite summaries whose typed by_arm blocks the panels read (harness ask 13): S2's paired
  // differences and attribution, S4's pairing over documents, S6's pairing in the loop. Each is
  // the suite's own summary in the run the composite reads the suite from.
  const blockPaths = ["S2", "S4", "S6"].flatMap((suite) => {
    const entry = view.suites.find((s) => s.suite === suite)
    const path = entry
      ? summaryOf.get(entry.run.run_id)?.suites.find((s) => s.id === suite)?.summary
      : undefined
    return entry && path ? [{ suite, runId: entry.run.run_id, path }] : []
  })
  const blockQueries = useDocumentsOfRuns(blockPaths, "d2/suite-summary")
  const blocksOf = (
    suite: string,
  ): { status: "pending" } | { status: "failed" } | { status: "ok"; blocks: ArmBlocks } => {
    const i = blockPaths.findIndex((entry) => entry.suite === suite)
    if (i < 0) {
      // No path yet: the run's summary is loading, or it loaded (or failed) without the suite.
      const entry = view.suites.find((s) => s.suite === suite)
      const k = entry ? runIds.indexOf(entry.run.run_id) : -1
      return k >= 0 && summaries[k]?.isPending ? { status: "pending" } : { status: "failed" }
    }
    const query = blockQueries[i]
    if (!query || query.isPending) return { status: "pending" }
    if (query.isError || !query.data.ok) return { status: "failed" }
    return { status: "ok", blocks: armBlocks(query.data.document) }
  }
  const blockPanel = (suite: string, render: (blocks: ArmBlocks) => ReactNode) => {
    const state = blocksOf(suite)
    if (state.status === "pending") return <Skeleton className="h-40 w-full" />
    if (state.status === "failed") {
      return (
        <p className="text-sm text-muted-foreground" data-state="empty">
          {suite}'s own summary could not be read; its suite page says why.
        </p>
      )
    }
    return render(state.blocks)
  }

  const metricsOf = (suite: string): { source: PanelSource; metrics: D2Metric[] } | null => {
    const entry = view.suites.find((s) => s.suite === suite)
    if (!entry) return null
    const summary = summaryOf.get(entry.run.run_id)
    if (!summary) return null
    return {
      source: { runId: entry.run.run_id, suite, size: sizes.get(entry.run.run_id) ?? null },
      metrics: summary.metrics.filter((metric) => metric.suite === suite),
    }
  }
  const s0 = metricsOf("S0")
  const s1 = metricsOf("S1")
  const s2 = metricsOf("S2")
  const s3 = metricsOf("S3")
  const s4 = metricsOf("S4")
  const s5 = metricsOf("S5")
  const s6 = metricsOf("S6")
  const s7 = metricsOf("S7")
  const budget = s2 ? headlineBudget(s2.metrics) : null
  const checkSources: CheckSource[] = [s0, s1, s5, s7].flatMap((entry) =>
    entry ? [{ suite: entry.source.suite, runId: entry.source.runId, metrics: entry.metrics }] : [],
  )
  const failed = summaries.flatMap((query, i) =>
    query.isError || (query.data && !query.data.ok) ? [runIds[i] as string] : [],
  )

  const panel = (
    suite: string,
    entry: { source: PanelSource; metrics: D2Metric[] } | null,
    render: (entry: { source: PanelSource; metrics: D2Metric[] }) => ReactNode,
  ) => {
    if (entry) return render(entry)
    const has = view.suites.some((s) => s.suite === suite)
    if (has && pending) return <Skeleton className="h-64 w-full" />
    const state: RegionState<never> = has
      ? { status: "empty", message: `${suite}'s run could not be read; its run page says why.` }
      : { status: "absent", what: suite }
    return (
      <DataRegion state={state} label={suite}>
        {() => null}
      </DataRegion>
    )
  }

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10">
      {view.unknownPin ? (
        <Alert data-state="unknown-run">
          <AlertTitle>The address names a run the index does not list</AlertTitle>
          <AlertDescription>
            <span className="font-mono">{view.unknownPin}</span> is not in Domain 2's index; each
            suite is read from its newest reported run instead.
          </AlertDescription>
        </Alert>
      ) : null}

      <PageSection
        id="claim"
        title="The claim"
        description="What Domain 2 is designed to establish about CWA, and the question it asks."
      >
        <p className="max-w-prose text-lg leading-snug font-medium">{domain?.claim}</p>
        <div className="max-w-prose space-y-2 text-sm">
          <p>{QUESTION.question}</p>
          <p className="text-muted-foreground">{QUESTION.heldEqual}</p>
        </div>
        {view.suites.length === 0 ? (
          <Alert data-state="no-runs">
            <AlertTitle>No finished run yet</AlertTitle>
            <AlertDescription>
              Domain 2's index lists no finished run, so there is no evidence to show.{" "}
              <Link to="/d2/runs" className="underline underline-offset-3">
                The runs list
              </Link>{" "}
              has what exists.
            </AlertDescription>
          </Alert>
        ) : (
          <SourcesTable view={view} sizes={sizes} />
        )}
        {failed.length > 0 ? (
          <Alert variant="destructive" data-state="unreadable">
            <AlertTitle>A run's summary could not be read</AlertTitle>
            <AlertDescription>
              {failed.map((runId) => (
                <Link
                  key={runId}
                  to={`/d2/runs/${runId}`}
                  className="mr-2 font-mono underline underline-offset-3"
                >
                  {runId}
                </Link>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}
      </PageSection>

      <PageSection
        id="answer"
        title="The answer, in words"
        description="What the write-up concludes for the run it reports. The panels below are the records of the runs this page reads, which may not be that run."
      >
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2" data-conclusions>
          {CONCLUSIONS.map((note) => (
            <li key={note.id} className="rounded-lg border p-4 text-sm">
              <h3 className="font-medium">{note.title}</h3>
              <p className="mt-1 text-muted-foreground">{note.text}</p>
            </li>
          ))}
        </ul>
        <p className="max-w-prose text-sm">{CONCLUSION}</p>
        <p className="text-xs text-muted-foreground">
          Words from{" "}
          <a
            href={sourceUrl(CONCLUSIONS_CITATION.file)}
            rel="noreferrer"
            className="underline underline-offset-3"
          >
            {CONCLUSIONS_CITATION.file}
          </a>
          .
        </p>
      </PageSection>

      <PageSection
        id="evidence"
        title="The evidence"
        description="Each suite's typed metrics, as the harness measured them. Each panel names its run."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
          <ArmLegend />
          <section aria-labelledby="aptitude-heading" className="space-y-3">
            <h3 id="aptitude-heading" className="text-sm font-medium">
              Does the model keep doing the task? Scripted conversations (S2)
            </h3>
            {panel("S2", s2, (entry) =>
              budget ? (
                <AptitudePanel
                  s2={entry.metrics}
                  s1={s1?.metrics ?? []}
                  budget={budget}
                  source={entry.source}
                  factSource={s1 ? s1.source : null}
                />
              ) : (
                <p className="text-sm text-muted-foreground" data-state="empty">
                  S2 measured no budget in this run.
                </p>
              ),
            )}
            {s2 ? (
              <p className="text-xs text-muted-foreground">
                <Link
                  to={`/d2/runs/${s2.source.runId}/suites/S2#arms`}
                  className="underline underline-offset-3"
                >
                  Every budget, the stale-answer rate and instruction persistence
                </Link>{" "}
                are on S2's page.
              </p>
            ) : null}
            {s2 && budget ? (
              <>
                <h4 className="pt-2 text-sm font-medium">Paired with the reference</h4>
                {blockPanel("S2", (blocks) => (
                  <PairedPanel entries={blocks.scripted} budget={budget} source={s2.source} />
                ))}
                <h4 className="pt-2 text-sm font-medium">Where the needed facts were</h4>
                {blockPanel("S2", (blocks) => (
                  <AttributionPanel entries={blocks.scripted} budget={budget} source={s2.source} />
                ))}
              </>
            ) : null}
          </section>
          <section aria-labelledby="documents-heading" className="space-y-3">
            <h3 id="documents-heading" className="text-sm font-medium">
              Over long documents (S4)
            </h3>
            {panel("S4", s4, (entry) => (
              <LongContextPanel metrics={entry.metrics} source={entry.source} />
            ))}
            {s4 ? (
              <>
                <h4 className="pt-2 text-sm font-medium">
                  Paired with the reference over documents
                </h4>
                {blockPanel("S4", (blocks) => (
                  <LongContextPairedPanel entries={blocks.lq} source={s4.source} />
                ))}
              </>
            ) : null}
          </section>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-10 xl:grid-cols-2">
            <section aria-labelledby="unreliability-heading" className="min-w-0 space-y-3">
              <h3 id="unreliability-heading" className="text-sm font-medium">
                How much repeated samples vary (S3)
              </h3>
              {panel("S3", s3, (entry) => {
                const tier = headlineBudget(
                  entry.metrics.map((metric) =>
                    metric.id === "s3.aptitude" ? { ...metric, id: "s2.aptitude" } : metric,
                  ),
                )
                return tier ? (
                  <UnreliabilityPanel metrics={entry.metrics} budget={tier} source={entry.source} />
                ) : (
                  <p className="text-sm text-muted-foreground" data-state="empty">
                    S3 measured no budget in this run.
                  </p>
                )
              })}
            </section>
            <section aria-labelledby="cost-heading" className="min-w-0 space-y-3">
              <h3 id="cost-heading" className="text-sm font-medium">
                What a correct answer costs (S5)
              </h3>
              {panel("S5", s5, (entry) =>
                budget ? (
                  <CostPanel metrics={entry.metrics} budget={budget} source={entry.source} />
                ) : (
                  <p className="text-sm text-muted-foreground" data-state="empty">
                    No budget to read S5 at: S2 is not in the runs read.
                  </p>
                ),
              )}
            </section>
          </div>
          <section aria-labelledby="loop-heading" className="space-y-3">
            <h3 id="loop-heading" className="text-sm font-medium">
              With the model's own replies as history (S6)
            </h3>
            {panel("S6", s6, (entry) => {
              const state = blocksOf("S6")
              return (
                <LoopPanel
                  metrics={entry.metrics}
                  source={entry.source}
                  blocks={state.status === "ok" ? state.blocks.loop : []}
                  blocksStatus={state.status}
                />
              )
            })}
          </section>
          <p className="max-w-prose text-sm text-muted-foreground" data-note="suite-pages">
            The breakdowns by family, conversation length and rule, by question kind and format, the
            abstentions, the under-count by prompt size, the replies' length and the model's calls
            are on the suite pages:{" "}
            {(
              [
                ["S2", s2, "breakdowns"],
                ["S4", s4, "breakdowns"],
                ["S5", s5, "cost"],
                ["S6", s6, "loop"],
              ] as const
            )
              .flatMap(([suite, entry, anchor]) => (entry ? [{ suite, entry, anchor }] : []))
              .map(({ suite, entry, anchor }, i, all) => (
                <span key={suite}>
                  <Link
                    to={`/d2/runs/${entry.source.runId}/suites/${suite}#${anchor}`}
                    className="underline underline-offset-3"
                  >
                    {suite}'s{" "}
                    {anchor === "cost" ? "cost" : anchor === "loop" ? "loop" : "breakdowns"}
                  </Link>
                  {i < all.length - 1 ? ", " : "."}
                </span>
              ))}
          </p>
        </div>
      </PageSection>

      <PageSection
        id="trust"
        title="How far to trust it"
        description="The checks the evidence itself passed, then what the write-up says of its own limits."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
          {pending && checkSources.length === 0 ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ChecksGrid checks={checks(checkSources)} />
          )}
          <TrustNotes />
        </div>
      </PageSection>

      <PageSection
        id="drill-down"
        title="The drill-down"
        description="Every number behind this page."
      >
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm" data-links>
          <li>
            <Link to="/d2/runs" className="underline underline-offset-3">
              Every run
            </Link>
          </li>
          {view.runs.map((run) => (
            <li key={run.run_id}>
              <Link to={`/d2/runs/${run.run_id}`} className="underline underline-offset-3">
                Run <span className="font-mono">{run.run_id}</span>
              </Link>
            </li>
          ))}
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
          <li>
            <Link to="/glossary" className="underline underline-offset-3">
              The glossary
            </Link>
          </li>
        </ul>
      </PageSection>
    </div>
  )
}

/** Which runs the page reads, each with the suites read from it and the scripts' size. */
function SourcesTable({ view, sizes }: { view: Composite; sizes: ReadonlyMap<string, string> }) {
  return (
    <TableRegion label="Runs read">
      <Table>
        <TableCaption className="sr-only">
          Each run this page reads, the suites it is read for, and the scripts' size in it.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Run</TableHead>
            <TableHead scope="col">Suites read from it</TableHead>
            <TableHead scope="col">Size</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.runs.map((run) => {
            const suites = view.suites.filter((source) => source.run.run_id === run.run_id)
            return (
              <TableRow key={run.run_id} data-run={run.run_id}>
                <TableCell className="align-top">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/d2/runs/${run.run_id}`}
                      className="font-mono text-xs underline underline-offset-3"
                    >
                      {run.run_id}
                    </Link>
                    <StatusBadge status={run.status} />
                    {run.ci_profile ? <Badge variant="outline">{run.ci_profile}</Badge> : null}
                    {suites.some((source) => source.pinned) ? (
                      <Badge variant="secondary">pinned</Badge>
                    ) : null}
                  </div>
                  <time dateTime={isoUtc(run.started_at)} className="text-xs text-muted-foreground">
                    {formatUtc(run.started_at)}
                  </time>
                </TableCell>
                <TableCell className="align-top">
                  <ul className="flex flex-wrap gap-x-3 gap-y-1">
                    {suites.map((source) => (
                      <li key={source.suite}>
                        <Link
                          to={`/d2/runs/${run.run_id}/suites/${source.suite}`}
                          className="font-mono text-xs underline underline-offset-3"
                          title={suiteWords(source.suite)}
                        >
                          {source.suite}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell className="align-top text-sm">
                  {sizes.get(run.run_id) ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableRegion>
  )
}
