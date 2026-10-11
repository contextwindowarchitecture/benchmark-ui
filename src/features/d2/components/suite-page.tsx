import { Download } from "lucide-react"
import { Link, useParams } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { familyWords, suiteWords } from "@/content/d2/vocabulary"
import { useDomainRunsIndex, useResultsSource, useRunDocument } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { D2RunIndexV1, D2SuiteSummaryV1, D2SummaryV1 } from "@/data/schema/generated"
import { newestRunWithSuite, parseRunId } from "@/features/d1/model/runs"
import {
  armTierTable,
  suiteArmMetricIds,
  suiteGateMetrics,
  type D2Metric,
} from "@/features/d2/model/metrics"
import { openBlocksOf, suiteRowFiles } from "@/features/d2/model/suite"
import { d2SuitePageParams } from "@/features/d2/model/url"
import { formatCount, formatDuration, formatUtc, isoUtc } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { ArmLegend } from "./arm-label"
import { ArmTierTable } from "./arm-tier-table"
import { GateMetricsTable, GatePanel, GoldensPanel, SelfCheckPanel } from "./suite-panels"
import { D2SuiteRows } from "./suite-rows"

type Loaded = { index: D2RunIndexV1; summary: D2SummaryV1; entry: D2SummaryV1["suites"][number] }

/**
 * One suite of a Domain 2 run (ui-plan.md 8.4, the UI-D2 plan): its status and what it is for,
 * its typed blocks, every metric it measured per arm laid out by arm and tier, and its rows. The
 * open blocks (`model`, `by_arm`, `cost`) are named and not read.
 */
export function D2SuitePage() {
  const { runId = "", suite = "" } = useParams()
  const parts = parseRunId(runId)
  const runsIndex = useDomainRunsIndex("d2")
  const index = useRunDocument(parts ? runId : undefined, "index.json", "d2/run-index")
  const summary = useRunDocument(parts ? runId : undefined, "summary.json", "d2/summary", {
    enabled: index.data?.ok === true,
  })
  const indexRegion = regionOfDocument(index, `${runId}/index.json`, `Run ${runId}`)
  const summaryRegion = regionOfDocument(summary, `${runId}/summary.json`, "the run's summary")
  const newest = runsIndex.data?.ok ? newestRunWithSuite(runsIndex.data.document, suite) : undefined

  let region: RegionState<Loaded>
  if (!parts) region = { status: "empty", message: `${runId} is not a run id.` }
  else if (indexRegion.status !== "ok") region = indexRegion
  else if (summaryRegion.status !== "ok") region = summaryRegion
  else {
    const entry = summaryRegion.data.suites.find((s) => s.id === suite)
    region = entry
      ? { status: "ok", data: { index: indexRegion.data, summary: summaryRegion.data, entry } }
      : {
          status: "absent",
          what: `Suite ${suite}`,
          newest:
            newest && newest.run_id !== runId
              ? { runId: newest.run_id, to: `/d2/runs/${newest.run_id}/suites/${suite}` }
              : undefined,
        }
  }
  const entry = region.status === "ok" ? region.data.entry : undefined

  return (
    <DashboardPage
      title={entry ? `${entry.id} · ${entry.title}` : suite}
      width="wide"
      description={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {entry ? <StatusBadge status={entry.status} /> : null}
          <span>
            Run{" "}
            <Link to={`/d2/runs/${runId}`} className="font-mono underline underline-offset-3">
              {runId}
            </Link>
          </span>
        </span>
      }
    >
      <DataRegion state={region} label="the suite" skeleton={<Skeleton className="h-96 w-full" />}>
        {(loaded) => <SuiteBody runId={runId} suite={suite} loaded={loaded} />}
      </DataRegion>
    </DashboardPage>
  )
}

function SuiteBody({ runId, suite, loaded }: { runId: string; suite: string; loaded: Loaded }) {
  const detail = useRunDocument(runId, loaded.entry.summary, "d2/suite-summary")
  const detailRegion = regionOfDocument(
    detail,
    `${runId}/${loaded.entry.summary}`,
    `${suite}'s summary`,
  )
  const metrics = loaded.summary.metrics.filter((metric) => metric.suite === suite)
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
      <p className="max-w-prose text-sm">{suiteWords(suite) ?? null}</p>
      <DataRegion
        state={detailRegion}
        label={`${suite}'s summary`}
        skeleton={<Skeleton className="h-40 w-full" />}
      >
        {(document) => <SuiteDetail runId={runId} summary={document} />}
      </DataRegion>
      <SuiteMetrics suite={suite} metrics={metrics} />
      <SuiteRowsSection
        runId={runId}
        suite={suite}
        index={loaded.index}
        results={detail.data?.ok ? detail.data.document.files.results : undefined}
      />
    </div>
  )
}

function SuiteDetail({ runId, summary }: { runId: string; summary: D2SuiteSummaryV1 }) {
  const source = useResultsSource()
  const open = openBlocksOf(summary)
  const started = summary.started_at
  const finished = summary.finished_at
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span>
          <time dateTime={isoUtc(started)}>{formatUtc(started)}</time> ·{" "}
          {formatDuration(Date.parse(finished) - Date.parse(started))}
        </span>
        {summary.corpora.length > 0 ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Read</span>
            {summary.corpora.map((corpus) => (
              <Badge key={corpus.id} variant="outline" title={familyWords(corpus.id)?.title}>
                {familyWords(corpus.id)?.code ?? corpus.id} · {formatCount(corpus.count)}
              </Badge>
            ))}
          </span>
        ) : null}
        {summary.adapters.length > 0 ? (
          <span className="flex flex-wrap items-center gap-3">
            {summary.adapters.map((adapter) => (
              <span key={adapter.adapter} className="inline-flex items-center gap-1">
                <AdapterMark adapter={adapter.adapter} />
                <StatusBadge status={adapter.status} iconOnly />
              </span>
            ))}
          </span>
        ) : null}
        {summary.requirements.length > 0 ? (
          <span className="font-mono text-xs">{summary.requirements.join(" ")}</span>
        ) : null}
        {summary.goldens?.candidates ? (
          <a
            href={source.url(runId, summary.goldens.candidates)}
            download
            className="inline-flex items-center gap-1 text-xs underline underline-offset-3"
          >
            <Download aria-hidden="true" className="size-3.5" /> Candidate goldens
          </a>
        ) : null}
      </div>
      {summary.self_check ? (
        <PageSection title="Self-checks" id="self-check">
          <SelfCheckPanel block={summary.self_check} />
        </PageSection>
      ) : null}
      {summary.gate || summary.rows ? (
        <PageSection title="The gate" id="gate">
          <GatePanel summary={summary} />
        </PageSection>
      ) : null}
      {summary.goldens ? (
        <PageSection title="Goldens" id="goldens">
          <GoldensPanel block={summary.goldens} />
        </PageSection>
      ) : null}
      {open.length > 0 ? (
        <Alert data-state="open-blocks">
          <AlertTitle>Not read until the harness types them</AlertTitle>
          <AlertDescription>
            <p>
              This suite's summary also holds{" "}
              {open.map((block, i) => (
                <span key={block}>
                  {i > 0 ? (i === open.length - 1 ? " and " : ", ") : ""}
                  <code>{block}</code>
                </span>
              ))}
              , whose schema leaves them open: the paired differences, the attribution by fact sent
              or not, and the breakdowns by family and turn count are there. This viewer reads only
              what a schema types; the metrics below are typed.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

function SuiteMetrics({ suite, metrics }: { suite: string; metrics: D2Metric[] }) {
  const gate = suiteGateMetrics(metrics, suite)
  const ids = suiteArmMetricIds(metrics, suite)
  const tables = ids.flatMap((id) => {
    const conversations = armTierTable(metrics, id, {
      tierKinds: ["budget", "control", "ratio"],
    })
    const corpora = armTierTable(metrics, id, { tierKinds: ["corpus"] })
    return [
      ...(conversations
        ? [{ key: `${id}:conversations`, table: conversations, corpora: false }]
        : []),
      ...(corpora ? [{ key: `${id}:corpora`, table: corpora, corpora: true }] : []),
    ]
  })
  if (gate.length === 0 && tables.length === 0) {
    return (
      <PageSection title="Metrics" id="metrics">
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          This suite measured no metrics in this run.
        </p>
      </PageSection>
    )
  }
  return (
    <>
      {gate.length > 0 ? (
        <PageSection
          title="Gated and counted"
          id="metrics"
          description="Metrics across every arm: what fails the suite when it fails."
        >
          <GateMetricsTable metrics={gate} label={`${suite} metrics table`} />
        </PageSection>
      ) : null}
      {tables.length > 0 ? (
        <PageSection
          title="By arm and tier"
          id="arms"
          description="Measured, not gated: each metric for each arm at each budget or corpus size, with its interval where the harness computed one."
        >
          <div className="space-y-6">
            <ArmLegend />
            {tables.map(({ key, table, corpora }) => (
              <section key={key} className="space-y-2" aria-labelledby={`${key}-title`}>
                <h3 id={`${key}-title`} className="font-medium">
                  {table.label}
                  {corpora ? " · long context" : ""}{" "}
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    {table.id}
                  </span>
                </h3>
                {table.description ? (
                  <p className="max-w-prose text-xs text-muted-foreground">{table.description}</p>
                ) : null}
                <ArmTierTable table={table} />
              </section>
            ))}
          </div>
        </PageSection>
      ) : null}
    </>
  )
}

function SuiteRowsSection({
  runId,
  suite,
  index,
  results,
}: {
  runId: string
  suite: string
  index: D2RunIndexV1
  /** The file the suite's summary names as its results, once that summary has loaded. */
  results: string | undefined
}) {
  const [state, setState] = useUrlState(d2SuitePageParams)
  const files = suiteRowFiles(index, suite, results)
  const file = files.find((candidate) => candidate.path === state.file) ?? files[0]
  return (
    <PageSection
      title="Rows"
      id="rows"
      description="One row per judged thing, loaded on request."
      actions={
        files.length > 1 && file ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">File</span>
            <Select
              value={file.path}
              onValueChange={(path) =>
                setState({
                  file: path,
                  arm: undefined,
                  family: undefined,
                  tier: undefined,
                  verdict: undefined,
                  tag: undefined,
                  q: undefined,
                  page: undefined,
                })
              }
            >
              <SelectTrigger size="sm" className="w-64 font-mono text-xs" aria-label="Row file">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {files.map((candidate) => (
                  <SelectItem key={candidate.path} value={candidate.path}>
                    {candidate.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null
      }
    >
      {file ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{file.path}</span>: {file.description}
          </p>
          <D2SuiteRows key={file.path} runId={runId} suite={suite} file={file} />
        </div>
      ) : (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          This suite wrote no row file this viewer reads.
        </p>
      )}
    </PageSection>
  )
}
