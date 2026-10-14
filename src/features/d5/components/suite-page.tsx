import { Download } from "lucide-react"
import { Link, useParams } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { suiteWords, taskFamilyWords } from "@/content/d5/vocabulary"
import { useDomainRunsIndex, useResultsSource, useRunDocument } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { D5RunIndexV1, D5SuiteSummaryV1, D5SummaryV1 } from "@/data/schema/generated"
import { newestRunWithSuite, parseRunId } from "@/features/d1/model/runs"
import { ArmLegend } from "@/features/d2/components/arm-label"
import { ArmTierTable } from "@/features/d2/components/arm-tier-table"
import {
  GateMetricsTable,
  GoldensPanel,
  SelfCheckPanel,
} from "@/features/d2/components/suite-panels"
import { armTierTable } from "@/features/d2/model/metrics"
import {
  armMetricTable,
  D5_ARM_ORDER,
  d5Metrics,
  pairedMetrics,
  suiteGateMetrics,
  tieredMetricIds,
  type D5Metric,
} from "@/features/d5/model/metrics"
import { suiteRowFiles } from "@/features/d5/model/suite"
import { compareD5Tiers } from "@/features/d5/model/tiers"
import { formatCount, formatDuration, formatPercent, formatUtc, isoUtc } from "@/lib/format"

import { ArmMetricTable, PairedMetricsTable } from "./metric-tables"

type Loaded = { index: D5RunIndexV1; summary: D5SummaryV1; entry: D5SummaryV1["suites"][number] }

/**
 * One suite of a Domain 5 run (the UI-D5 plan, as Domain 2's suite page): its status and what it
 * is for, its typed blocks (the self-check, the gate, the adaptive budget, the goldens), every
 * metric it measured (the gates and counts, by arm, by arm and tier, the paired differences), and
 * its row files. The `by_arm` and `model` blocks are open objects (ask 20) and are not read.
 */
export function D5SuitePage() {
  const { runId = "", suite = "" } = useParams()
  const parts = parseRunId(runId)
  const runsIndex = useDomainRunsIndex("d5")
  const index = useRunDocument(parts ? runId : undefined, "index.json", "d5/run-index")
  const summary = useRunDocument(parts ? runId : undefined, "summary.json", "d5/summary", {
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
              ? { runId: newest.run_id, to: `/d5/runs/${newest.run_id}/suites/${suite}` }
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
            <Link to={`/d5/runs/${runId}`} className="font-mono underline underline-offset-3">
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
  const detail = useRunDocument(runId, loaded.entry.summary, "d5/suite-summary")
  const detailRegion = regionOfDocument(
    detail,
    `${runId}/${loaded.entry.summary}`,
    `${suite}'s summary`,
  )
  const metrics = d5Metrics(loaded.summary.metrics).filter((metric) => metric.suite === suite)
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
      <SuiteRows
        runId={runId}
        suite={suite}
        index={loaded.index}
        results={detail.data?.ok ? detail.data.document.files.results : undefined}
      />
    </div>
  )
}

function SuiteDetail({ runId, summary }: { runId: string; summary: D5SuiteSummaryV1 }) {
  const source = useResultsSource()
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span>
          <time dateTime={isoUtc(summary.started_at)}>{formatUtc(summary.started_at)}</time> ·{" "}
          {formatDuration(Date.parse(summary.finished_at) - Date.parse(summary.started_at))}
        </span>
        {summary.corpora.length > 0 ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Read</span>
            {summary.corpora.map((corpus) => {
              const family = taskFamilyWords(corpus.id)
              return (
                <Badge key={corpus.id} variant="outline" title={family?.title}>
                  {family?.code ?? corpus.id} · {formatCount(corpus.count)}
                </Badge>
              )
            })}
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
      {summary.gate ? (
        <PageSection title="The gate" id="gate">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Cells and CWA arms through the gate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-2xl font-semibold tabular">
                {formatCount(summary.gate.passed)}
                <span className="text-base font-light text-muted-foreground">
                  {" "}
                  / {formatCount(summary.gate.total)}
                </span>
              </p>
              <p className="text-muted-foreground">
                {summary.gate.total > 0
                  ? formatPercent(summary.gate.passed / summary.gate.total)
                  : "none gated"}
                . A CWA payload is sent only when all four assemblers agree with the prediction, the
                audit is clean and the structure oracle reads it back item for item.
              </p>
              {summary.gate.failed.length > 0 ? (
                <ul className="font-mono text-xs">
                  {summary.gate.failed.map((cell) => (
                    <li key={cell}>{cell}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        </PageSection>
      ) : null}
      {summary.budget ? (
        <PageSection
          title="The attacker's budget"
          id="budget"
          description="Target queries per arm, the share of each search, and where the best attack so far was sent against every instance."
        >
          <dl className="grid max-w-xl grid-cols-[auto_auto] justify-start gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Queries per arm</dt>
            <dd className="tabular">{formatCount(summary.budget.per_arm)}</dd>
            <dt className="text-muted-foreground">Random search</dt>
            <dd className="tabular">{formatCount(summary.budget.random)}</dd>
            <dt className="text-muted-foreground">Attacker loop</dt>
            <dd className="tabular">{formatCount(summary.budget.loop)}</dd>
            <dt className="text-muted-foreground">Checkpoints</dt>
            <dd className="tabular">{summary.budget.checkpoints.map(formatCount).join(", ")}</dd>
          </dl>
        </PageSection>
      ) : null}
      {summary.goldens ? (
        <PageSection title="Goldens" id="goldens">
          <GoldensPanel block={summary.goldens} />
        </PageSection>
      ) : null}
    </div>
  )
}

function SuiteMetrics({ suite, metrics }: { suite: string; metrics: D5Metric[] }) {
  const gate = suiteGateMetrics(metrics, suite)
  const byArm = armMetricTable(metrics, suite)
  const tiered = tieredMetricIds(metrics, suite).flatMap((id) => {
    const table = armTierTable(metrics, id, {
      order: D5_ARM_ORDER,
      compareTier: compareD5Tiers(id),
    })
    return table ? [table] : []
  })
  const paired = pairedMetrics(metrics, suite)
  if (gate.length === 0 && !byArm && tiered.length === 0 && paired.length === 0) {
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
      {byArm || tiered.length > 0 ? (
        <PageSection
          title="By arm"
          id="arms"
          description="Measured, not gated: each metric for each arm, with its fraction and interval where the harness computed one; then the metrics measured at each tier."
        >
          <div className="space-y-6">
            <ArmLegend />
            {byArm ? <ArmMetricTable table={byArm} label={`${suite} metrics by arm`} /> : null}
            {tiered.map((table) => (
              <section key={table.id} className="space-y-2" aria-labelledby={`${table.id}-title`}>
                <h3 id={`${table.id}-title`} className="font-medium">
                  {table.label}{" "}
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
      {paired.length > 0 ? (
        <PageSection
          title="Paired with a reference"
          id="paired"
          description="Each arm less its reference arm on the same probes, in percentage points, with the harness's interval: the controlled pairs the write-up compares."
        >
          <PairedMetricsTable entries={paired} label={`${suite} paired differences`} />
        </PageSection>
      ) : null}
    </>
  )
}

function SuiteRows({
  runId,
  suite,
  index,
  results,
}: {
  runId: string
  suite: string
  index: D5RunIndexV1
  results: string | undefined
}) {
  const source = useResultsSource()
  const files = suiteRowFiles(index, suite, results)
  return (
    <PageSection
      title="Rows"
      id="rows"
      description="The suite's row files, one row per judged thing, to download. This viewer does not yet browse Domain 5's rows."
    >
      {files.length === 0 ? (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          This suite wrote no row file.
        </p>
      ) : (
        <TableRegion label="Row files">
          <Table>
            <TableCaption className="sr-only">
              Each row file of the suite: its kind, what it holds, its rows, and a download.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">File</TableHead>
                <TableHead scope="col">What it holds</TableHead>
                <TableHead scope="col" className="text-right">
                  Rows
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.path} data-file={file.path}>
                  <TableCell className="align-top">
                    <a
                      href={source.url(runId, file.path)}
                      download
                      className="inline-flex items-center gap-1 font-mono text-xs underline underline-offset-3"
                    >
                      <Download aria-hidden="true" className="size-3.5" />
                      {file.path}
                    </a>
                    <div className="font-mono text-xs text-muted-foreground">{file.kind}</div>
                  </TableCell>
                  <TableCell className="max-w-prose align-top text-xs">
                    {file.description}
                  </TableCell>
                  <TableCell className="tabular text-right align-top">
                    {file.rows === null ? "—" : formatCount(file.rows)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRegion>
      )}
    </PageSection>
  )
}
