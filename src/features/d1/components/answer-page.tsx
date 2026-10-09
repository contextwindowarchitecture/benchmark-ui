import { lazy, Suspense, useMemo } from "react"
import { Link, useParams } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { Digest } from "@/components/dashboard/digest"
import { Outcome } from "@/components/dashboard/outcome"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { documentOf, useRunDocument } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { RunIndexV1 } from "@/data/schema/generated"
import { useBlob, useBlobIndex, type BlobIndexHandle } from "@/data/use-blobs"
import { useRowPage, useRows } from "@/data/use-rows"
import {
  caseView,
  timelinePath,
  type AnswerPart,
  type AnswerView,
  type CaseView,
} from "@/features/d1/model/answers"
import { isRowKind } from "@/features/d1/model/row-kinds"
import { parseRunId } from "@/features/d1/model/runs"
import { isSuiteId, suiteFile } from "@/features/d1/model/suite"
import { adapterLabel } from "@/lib/adapters"
import { formatCount, formatMs } from "@/lib/format"

import { BlobView } from "./blob-view"
import { DiffView } from "./diff-view"
import { TimelineLanesTable } from "./timeline-lanes-table"

// The walk carries GSAP (DESIGN.md 2.2); it loads with the first timeline shown, not with the page.
const PipelineWalk = lazy(() =>
  import("./pipeline-walk").then((module) => ({ default: module.PipelineWalk })),
)

/**
 * One snapshot's answer from each adapter (ui-plan.md 8.9), from the suite's rows for the case:
 * outcome, tokens, wall time, the checks, the blobs where they exist, a diff of the trace against
 * the expected one, and the timeline's events when the run has one.
 */
export function AnswerPage() {
  const { runId = "", suite = "", caseId = "" } = useParams()
  const parts = parseRunId(runId)
  const validSuite = isSuiteId(suite)
  const index = useRunDocument(parts && validSuite ? runId : undefined, "index.json", "run-index")
  const runIndex = documentOf(index.data)
  const file = runIndex ? suiteFile(runIndex, suite, "results.jsonl") : undefined
  const kind = file?.kind && isRowKind(file.kind) ? file.kind : null
  const rows = useRows(runId, file?.path ?? `suites/${suite}/results.jsonl`, kind ?? "result-row", {
    expectedRows: file?.rows,
    enabled: kind !== null,
  })
  const { page, pending } = useRowPage(rows, { filter: { caseId }, page: 1, pageSize: 500 })
  const view = useMemo(() => (kind && page ? caseView(kind, page.rows) : null), [kind, page])
  const blobs = useBlobIndex(runId, runIndex)

  const indexRegion: RegionState<RunIndexV1> = !parts
    ? { status: "empty", message: `${runId} is not a run id.` }
    : !validSuite
      ? { status: "empty", message: `${suite} is not a suite id.` }
      : regionOfDocument(index, `${runId}/index.json`, `Run ${runId}`)

  return (
    <DashboardPage
      title={caseId}
      width="wide"
      description={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            Case of{" "}
            <Link
              to={`/d1/runs/${runId}/suites/${suite}`}
              className="font-mono underline underline-offset-3"
            >
              {suite}
            </Link>{" "}
            in run{" "}
            <Link to={`/d1/runs/${runId}`} className="font-mono underline underline-offset-3">
              {runId}
            </Link>
          </span>
          {view?.verdict ? <StatusBadge status={view.verdict} /> : null}
          {view?.agree !== null && view?.agree !== undefined ? (
            <span className="text-xs">
              {view.agree ? "the adapters agree" : "the adapters disagree"}
            </span>
          ) : null}
        </span>
      }
    >
      <DataRegion
        state={indexRegion}
        label="the run"
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        {(run) => {
          if (!file) {
            return (
              <DataRegion
                state={{ status: "absent", what: `suites/${suite}/results.jsonl` }}
                label="the rows"
              >
                {() => null}
              </DataRegion>
            )
          }
          if (!kind) {
            return (
              <DataRegion
                state={{ status: "unsupported", schema: file.schema, path: file.path }}
                label="the rows"
              >
                {() => null}
              </DataRegion>
            )
          }
          if (rows.status === "error") {
            return (
              <Alert variant="destructive">
                <AlertTitle>Could not load the rows</AlertTitle>
                <AlertDescription>{rows.error.message}</AlertDescription>
              </Alert>
            )
          }
          if (rows.status === "over-budget") {
            return (
              <Alert data-state="over-budget">
                <AlertTitle>Too many rows to search here</AlertTitle>
                <AlertDescription>
                  {formatCount(rows.rows)} rows exceed the {formatCount(rows.budget)}-row budget.
                </AlertDescription>
              </Alert>
            )
          }
          if (!page || pending)
            return <Skeleton className="h-96 w-full" aria-label="Loading the answers" />
          if (!view) {
            return (
              <DataRegion
                state={{ status: "empty", message: `No row of ${suite} judges case ${caseId}.` }}
                label="the answers"
              >
                {() => null}
              </DataRegion>
            )
          }
          return <Answers runId={runId} run={run} view={view} blobs={blobs} />
        }}
      </DataRegion>
    </DashboardPage>
  )
}

function Answers({
  runId,
  run,
  view,
  blobs,
}: {
  runId: string
  run: RunIndexV1
  view: CaseView
  blobs: BlobIndexHandle
}) {
  const caseBlobs = view.blobs.filter((blob) => blob.digest !== null)
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
      <PageSection
        title="The snapshot"
        id="snapshot"
        description="What every adapter was given, and what the suite expected of it."
      >
        {view.note ? (
          <Alert data-state="note">
            <AlertTitle>{view.note}</AlertTitle>
          </Alert>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>The case</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Rows</dt>
                <dd className="tabular">
                  {formatCount(view.rows)} of <span className="font-mono text-xs">{view.kind}</span>
                </dd>
                <dt className="text-muted-foreground">Expected</dt>
                <dd>
                  {view.expected ? (
                    <>
                      <Outcome value={view.expected.outcome} />
                      {view.expected.refusalReason ? (
                        <span className="ml-1 font-mono text-xs text-muted-foreground">
                          {view.expected.refusalReason}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">no expectation recorded</span>
                  )}
                </dd>
                {view.groups ? (
                  <>
                    <dt className="text-muted-foreground">Groups</dt>
                    <dd className="text-xs">
                      {view.groups.length === 0
                        ? "—"
                        : view.groups.map((g) => `[${g.map(adapterLabel).join(", ")}]`).join(" ")}
                    </dd>
                  </>
                ) : null}
                {view.hashes.map((hash) => (
                  <div key={hash.label} className="contents">
                    <dt className="text-muted-foreground">{hash.label}</dt>
                    <dd>
                      {hash.value ? (
                        <Digest value={hash.value} label={hash.label} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <div className="grid gap-3 self-start">
            {caseBlobs.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-blob="none">
                No snapshot blob is referenced by these rows.
              </p>
            ) : (
              caseBlobs.map((blob) => (
                <BlobView
                  key={blob.label}
                  runId={runId}
                  digest={blob.digest}
                  index={blobs}
                  label={blob.label}
                />
              ))
            )}
          </div>
        </div>
      </PageSection>
      <PageSection
        title="Answers"
        id="answers"
        description="One column per adapter, in the fixed order."
      >
        {view.answers.length === 0 ? (
          <p
            className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
            data-state="empty"
          >
            No answer in these rows.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            {view.answers.map((answer) => (
              <AnswerCard
                key={answer.adapter}
                runId={runId}
                run={run}
                view={view}
                answer={answer}
                blobs={blobs}
              />
            ))}
          </div>
        )}
      </PageSection>
    </div>
  )
}

function AnswerCard({
  runId,
  run,
  view,
  answer,
  blobs,
}: {
  runId: string
  run: RunIndexV1
  view: CaseView
  answer: AnswerView
  blobs: BlobIndexHandle
}) {
  const failed = answer.checks.filter((check) => check.status === "fail")
  const passed = answer.checks.filter((check) => check.status === "pass")
  const rest = answer.checks.filter((check) => check.status !== "fail" && check.status !== "pass")
  const timeline = view.snapshotHex ? timelinePath(view.snapshotHex, answer.adapter) : null
  const timelineListed = timeline !== null && run.files.some((file) => file.path === timeline)
  return (
    <Card className="min-w-0" data-adapter={answer.adapter}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {answer.adapter === "harness" ? "The harness" : <AdapterMark adapter={answer.adapter} />}
          {answer.verdict ? <StatusBadge status={answer.verdict} /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {answer.parts.map((part, i) => (
          <PartView key={i} runId={runId} part={part} blobs={blobs} />
        ))}
        {answer.checks.length > 0 ? (
          <div className="space-y-1 text-sm">
            <h3 className="font-medium">Checks</h3>
            {failed.length > 0 ? (
              <ul className="space-y-1">
                {failed.map((check) => (
                  <li key={`${check.oracle}:${check.id}`} className="text-xs">
                    <StatusBadge status="fail" iconOnly />{" "}
                    <span className="font-mono">{check.id}</span>{" "}
                    <span className="text-muted-foreground">({check.oracle})</span>
                    {check.detail ? <div className="text-failure">{check.detail}</div> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {formatCount(passed.length)} passed
              {rest.length > 0 ? `, ${formatCount(rest.length)} skipped or not run` : ""}
              {failed.length === 0 ? ", none failed" : ""}.
            </p>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Every check</summary>
              <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
                {answer.checks.map((check) => (
                  <li key={`${check.oracle}:${check.id}`} className="font-mono">
                    {check.id}{" "}
                    <span className="text-muted-foreground">
                      {check.oracle} · {check.status}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ) : null}
        {answer.diff ? (
          <TraceDiff
            runId={runId}
            actual={answer.diff.actual}
            expected={answer.diff.expected}
            blobs={blobs}
          />
        ) : null}
        {timeline ? (
          timelineListed ? (
            <Timeline runId={runId} path={timeline} />
          ) : (
            <p className="text-xs text-muted-foreground" data-timeline="absent">
              No timeline for this snapshot and adapter in this run.
            </p>
          )
        ) : null}
      </CardContent>
    </Card>
  )
}

function PartView({
  runId,
  part,
  blobs,
}: {
  runId: string
  part: AnswerPart
  blobs: BlobIndexHandle
}) {
  const present = part.blobs.filter((blob) => blob.digest !== null)
  return (
    <div className="space-y-2 rounded-lg border p-3" data-part={part.label ?? "answer"}>
      {part.label ? <h3 className="font-mono text-xs font-medium">{part.label}</h3> : null}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-muted-foreground">Outcome</dt>
        <dd>
          <Outcome value={part.outcome} />
          {part.refusalReason ? (
            <span className="ml-1 font-mono text-muted-foreground">{part.refusalReason}</span>
          ) : null}
          {part.prediction ? (
            <span className="ml-1 text-muted-foreground">predicted {part.prediction}</span>
          ) : null}
          {part.applied === false ? (
            <span className="ml-1 text-muted-foreground">(cell not applied)</span>
          ) : null}
        </dd>
        {part.exitCode !== null ? (
          <>
            <dt className="text-muted-foreground">Exit code</dt>
            <dd className="tabular">{part.exitCode}</dd>
          </>
        ) : null}
        {part.inputTokens !== null || part.budgetInput !== null ? (
          <>
            <dt className="text-muted-foreground">Tokens</dt>
            <dd className="tabular">
              {part.inputTokens !== null ? `${formatCount(part.inputTokens)} input` : ""}
              {part.chargedTokens !== null ? `, ${formatCount(part.chargedTokens)} charged` : ""}
              {part.budgetInput !== null ? ` of a ${formatCount(part.budgetInput)} budget` : ""}
            </dd>
          </>
        ) : null}
        {part.wallMs !== null ? (
          <>
            <dt className="text-muted-foreground">Wall</dt>
            <dd className="tabular">{formatMs(part.wallMs)}</dd>
          </>
        ) : null}
        {part.matches ? (
          <>
            <dt className="text-muted-foreground">Matches</dt>
            <dd>
              decision {part.matches.decision ? "yes" : "no"} · payload{" "}
              {part.matches.payload === null ? "—" : part.matches.payload ? "yes" : "no"} · trace{" "}
              {part.matches.trace === null ? "—" : part.matches.trace ? "yes" : "no"}
            </dd>
          </>
        ) : null}
        {part.auditFailed.length > 0 ? (
          <>
            <dt className="text-muted-foreground">Audit failed</dt>
            <dd className="font-mono text-failure">{part.auditFailed.join(", ")}</dd>
          </>
        ) : null}
        {part.problem ? (
          <>
            <dt className="text-muted-foreground">Detail</dt>
            <dd className="text-failure">{part.problem}</dd>
          </>
        ) : null}
        {part.hashes
          .filter((hash) => hash.value !== null)
          .map((hash) => (
            <div key={hash.label} className="contents">
              <dt className="text-muted-foreground">{hash.label}</dt>
              <dd>
                <Digest value={hash.value ?? ""} label={hash.label} />
              </dd>
            </div>
          ))}
      </dl>
      {present.length > 0 ? (
        <div className="grid gap-2">
          {present.map((blob) => (
            <BlobView
              key={blob.label}
              runId={runId}
              digest={blob.digest}
              index={blobs}
              label={blob.label}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground" data-blob="hashes-only">
          Hashes only for this answer.
        </p>
      )}
    </div>
  )
}

function TraceDiff({
  runId,
  actual,
  expected,
  blobs,
}: {
  runId: string
  actual: string
  expected: string
  blobs: BlobIndexHandle
}) {
  const actualBlob = useBlob(runId, actual, blobs)
  const expectedBlob = useBlob(runId, expected, blobs)
  if (actualBlob.status === "loading" || expectedBlob.status === "loading") {
    return <Skeleton className="h-10 w-full" aria-label="Loading the traces to diff" />
  }
  if (actualBlob.status !== "ready" || expectedBlob.status !== "ready") {
    return (
      <p className="text-xs text-muted-foreground" data-diff="unavailable">
        The trace differs from the expected trace, but one of them is not in this run's blobs to
        diff.
      </p>
    )
  }
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium">Trace against the expected trace</h3>
      <DiffView
        before={expectedBlob.text}
        after={actualBlob.text}
        beforeLabel="the expected trace"
        afterLabel="the trace"
      />
    </div>
  )
}

function Timeline({ runId, path }: { runId: string; path: string }) {
  const timeline = useRunDocument(runId, path, "timeline")
  return (
    <DataRegion
      state={regionOfDocument(timeline, `${runId}/${path}`, "The timeline")}
      label="the timeline"
      skeleton={<Skeleton className="h-24 w-full" />}
    >
      {(document) => (
        <div className="space-y-3" data-timeline="ready">
          <TimelineLanesTable timeline={document} />
          <Suspense fallback={<Skeleton className="h-64 w-full" aria-label="Loading the walk" />}>
            <PipelineWalk timeline={document} runId={runId} path={path} withTable={false} />
          </Suspense>
        </div>
      )}
    </DataRegion>
  )
}
