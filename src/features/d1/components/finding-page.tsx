import { ExternalLink } from "lucide-react"
import { Link, useParams } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { Digest } from "@/components/dashboard/digest"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { documentOf, useResultsSource, useRunDocument, useRunRaw } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { FindingV1, MinimizationV1, RunIndexV1 } from "@/data/schema/generated"
import { useBlobIndex, type BlobIndexHandle } from "@/data/use-blobs"
import { useRowPage, useRows } from "@/data/use-rows"
import {
  draftFiles,
  entriesOf,
  findingRowsPath,
  findingsFile,
  minimizationPath,
  sizeRows,
} from "@/features/d1/model/findings"
import { parseRunId } from "@/features/d1/model/runs"
import { answerPath, requirementChips } from "@/features/d1/model/suite"
import { formatCount } from "@/lib/format"
import { prettyJson } from "@/lib/line-diff"

import { BlobView } from "./blob-view"

/** One finding (ui-plan.md 8.6): what failed, the reproducer, the minimization and its draft. */
export function FindingPage() {
  const { runId = "", findingId = "" } = useParams()
  const parts = parseRunId(runId)
  const index = useRunDocument(parts ? runId : undefined, "index.json", "run-index")
  const runIndex = documentOf(index.data)
  const file = runIndex ? findingsFile(runIndex) : undefined
  const rows = useRows(runId, file?.path ?? "findings.jsonl", "finding", {
    expectedRows: file?.rows,
    enabled: file !== undefined,
  })
  const { page, pending } = useRowPage(rows, {
    filter: { finding: findingId },
    page: 1,
    pageSize: 1,
  })
  const finding = page?.rows[0]?.document
  const blobs = useBlobIndex(runId, runIndex)
  const contract = useRunDocument(runId, "contract.json", "contract", {
    enabled: runIndex !== undefined,
  })

  const indexRegion: RegionState<RunIndexV1> = parts
    ? regionOfDocument(index, `${runId}/index.json`, `Run ${runId}`)
    : { status: "empty", message: `${runId} is not a run id.` }

  return (
    <DashboardPage
      title={finding ? `Finding ${finding.finding_id}` : `Finding ${findingId}`}
      width="wide"
      description={
        finding ? (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge status={finding.severity} />
            <Link
              to={`/d1/runs/${runId}/suites/${finding.suite}`}
              className="font-mono underline underline-offset-3"
            >
              {finding.suite}
            </Link>
            <span>
              in run{" "}
              <Link to={`/d1/runs/${runId}`} className="font-mono underline underline-offset-3">
                {runId}
              </Link>
            </span>
          </span>
        ) : undefined
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
              <DataRegion state={{ status: "absent", what: "findings.jsonl" }} label="findings">
                {() => null}
              </DataRegion>
            )
          }
          if (rows.status === "error") {
            return (
              <Alert variant="destructive">
                <AlertTitle>Could not load the findings</AlertTitle>
                <AlertDescription>{rows.error.message}</AlertDescription>
              </Alert>
            )
          }
          if (rows.status === "over-budget") {
            return (
              <Alert data-state="over-budget">
                <AlertTitle>Too many findings to search here</AlertTitle>
                <AlertDescription>
                  {formatCount(rows.rows)} findings exceed the {formatCount(rows.budget)}-row
                  budget.
                </AlertDescription>
              </Alert>
            )
          }
          if (!page || pending)
            return <Skeleton className="h-96 w-full" aria-label="Loading the finding" />
          if (!finding) {
            return (
              <DataRegion
                state={{ status: "empty", message: `No finding ${findingId} in this run.` }}
                label="the finding"
              >
                {() => null}
              </DataRegion>
            )
          }
          return (
            <Finding
              runId={runId}
              run={run}
              finding={finding}
              blobs={blobs}
              contractDocument={documentOf(contract.data)}
            />
          )
        }}
      </DataRegion>
    </DashboardPage>
  )
}

function Finding({
  runId,
  run,
  finding,
  blobs,
  contractDocument,
}: {
  runId: string
  run: RunIndexV1
  finding: FindingV1
  blobs: BlobIndexHandle
  contractDocument: ReturnType<typeof documentOf<"contract">>
}) {
  const chips = requirementChips(finding.requirements, contractDocument)
  const adapters = finding.adapter ? [finding.adapter] : (finding.adapters ?? [])
  const signature = entriesOf(finding.signature)
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
      <PageSection title="What failed" id="what" description={finding.summary}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>The finding</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Oracle</dt>
                <dd>
                  {finding.oracle}
                  {finding.checks.length > 0 ? (
                    <span className="ml-1 font-mono text-xs text-muted-foreground">
                      {finding.checks.join(", ")}
                    </span>
                  ) : null}
                </dd>
                <dt className="text-muted-foreground">Adapters</dt>
                <dd className="flex flex-wrap gap-2">
                  {adapters.length === 0 ? (
                    <span className="text-muted-foreground">all</span>
                  ) : (
                    adapters.map((adapter) => <AdapterMark key={adapter} adapter={adapter} />)
                  )}
                </dd>
                <dt className="text-muted-foreground">Case</dt>
                <dd>
                  <Link
                    to={answerPath(runId, finding.suite, finding.case_id)}
                    className="font-mono text-xs break-all underline underline-offset-3"
                  >
                    {finding.case_id}
                  </Link>
                </dd>
                <dt className="text-muted-foreground">Occurrences</dt>
                <dd className="tabular">{formatCount(finding.occurrences)}</dd>
                {finding.first_pointer ? (
                  <>
                    <dt className="text-muted-foreground">First pointer</dt>
                    <dd className="font-mono text-xs break-all">{finding.first_pointer}</dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">Rows</dt>
                <dd>
                  <Link
                    to={findingRowsPath(runId, finding)}
                    className="underline underline-offset-3"
                  >
                    The rows that carry this finding
                  </Link>
                </dd>
                <dt className="text-muted-foreground">Upstream</dt>
                <dd>
                  {finding.upstream ? (
                    <a
                      href={finding.upstream.url}
                      className="inline-flex items-center gap-1 underline underline-offset-3"
                      rel="noreferrer"
                    >
                      {finding.upstream.state}{" "}
                      <ExternalLink aria-hidden="true" className="size-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">not reported upstream</span>
                  )}
                  {finding.upstream?.note ? (
                    <div className="text-xs text-muted-foreground">{finding.upstream.note}</div>
                  ) : null}
                </dd>
              </dl>
            </CardContent>
          </Card>
          <div className="grid gap-4">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                {chips.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None named.</p>
                ) : (
                  <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                    {chips.map((chip) => (
                      <div key={chip.id} className="contents">
                        <dt>
                          <Badge variant="outline" className="font-mono text-[0.7rem]">
                            {chip.id}
                          </Badge>
                        </dt>
                        <dd className="text-xs">
                          {chip.summary ?? (
                            <span className="text-muted-foreground">loading the contract…</span>
                          )}
                          {chip.text ? (
                            <div className="mt-0.5 text-muted-foreground">{chip.text}</div>
                          ) : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Signature</CardTitle>
              </CardHeader>
              <CardContent>
                {signature.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No signature recorded.</p>
                ) : (
                  <dl className="grid gap-x-3 gap-y-1 text-xs sm:grid-cols-[auto_minmax(0,1fr)]">
                    {signature.map((entry) => (
                      <div key={entry.key} className="contents">
                        <dt className="font-mono text-muted-foreground">{entry.key}</dt>
                        <dd className="font-mono break-all">{entry.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageSection>
      <PageSection
        title="Reproducer"
        id="reproducer"
        description="The snapshot the finding was first seen on, as the harness kept it."
      >
        {finding.reproducer ? (
          <div className="space-y-2">
            {finding.reproducer.spec_path ? (
              <p className="text-sm">
                From the spec's corpus at{" "}
                <span className="font-mono text-xs">{finding.reproducer.spec_path}</span>.
              </p>
            ) : null}
            <BlobView
              runId={runId}
              digest={finding.reproducer.snapshot}
              index={blobs}
              label="reproducer snapshot"
              open
            />
          </div>
        ) : (
          <p
            className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
            data-state="empty"
          >
            The finding has no reproducer snapshot.
          </p>
        )}
      </PageSection>
      <PageSection
        title="Minimization"
        id="minimization"
        description="How far the harness shrank the snapshot while the finding still reproduced, and the draft case it wrote."
      >
        {finding.minimized ? (
          <Minimization runId={runId} run={run} finding={finding} blobs={blobs} />
        ) : (
          <p
            className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
            data-state="empty"
          >
            The harness did not minimize this finding.
          </p>
        )}
      </PageSection>
    </div>
  )
}

function Minimization({
  runId,
  run,
  finding,
  blobs,
}: {
  runId: string
  run: RunIndexV1
  finding: FindingV1
  blobs: BlobIndexHandle
}) {
  const path = minimizationPath(finding) ?? ""
  const listed = run.files.some((file) => file.path === path)
  const record = useRunDocument(runId, path, "minimization", { enabled: listed })
  const minimized = finding.minimized
  if (!minimized) return null
  if (!listed) {
    return (
      <DataRegion state={{ status: "absent", what: path }} label="the minimization record">
        {() => null}
      </DataRegion>
    )
  }
  return (
    <div className="space-y-4">
      {!minimized.reproduces ? (
        <Alert data-state="not-reproducing">
          <AlertTitle>The minimized draft does not reproduce the finding</AlertTitle>
          <AlertDescription>
            The harness kept the draft for a person to look at; the record below says how far it
            got.
          </AlertDescription>
        </Alert>
      ) : null}
      <DataRegion
        state={regionOfDocument(record, `${runId}/${path}`, "The minimization record")}
        label="the minimization record"
        skeleton={<Skeleton className="h-40 w-full" />}
      >
        {(document) => (
          <MinimizationRecord runId={runId} run={run} minimization={document} blobs={blobs} />
        )}
      </DataRegion>
    </div>
  )
}

function MinimizationRecord({
  runId,
  run,
  minimization,
  blobs,
}: {
  runId: string
  run: RunIndexV1
  minimization: MinimizationV1
  blobs: BlobIndexHandle
}) {
  const source = useResultsSource()
  const sizes = sizeRows(minimization)
  const files = draftFiles(run, minimization)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>The record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
            <dt className="text-muted-foreground">Reproduces</dt>
            <dd>
              <StatusBadge
                status={minimization.reproduces ? "pass" : "warning"}
                label={minimization.reproduces ? "yes" : "no"}
              />
            </dd>
            <dt className="text-muted-foreground">Tests</dt>
            <dd className="tabular">
              {formatCount(minimization.tests)}, {formatCount(minimization.reductions)} reductions,{" "}
              {minimization.exhausted ? "every reduction tried" : "not exhausted"}
            </dd>
            <dt className="text-muted-foreground">Original</dt>
            <dd>
              <Digest value={minimization.original} label="original snapshot digest" />
            </dd>
            <dt className="text-muted-foreground">Minimized</dt>
            <dd>
              <Digest value={minimization.minimized} label="minimized snapshot digest" />
            </dd>
            <dt className="text-muted-foreground">Draft</dt>
            <dd className="font-mono text-xs">
              {minimization.draft.kind} {minimization.draft.id} · {minimization.draft.path}
            </dd>
            <dt className="text-muted-foreground">Expected from</dt>
            <dd className="text-xs">
              {minimization.draft.expected_from ?? (
                <span className="text-muted-foreground">nothing: no expectation</span>
              )}
            </dd>
            {minimization.draft.note ? (
              <>
                <dt className="text-muted-foreground">Note</dt>
                <dd className="text-xs">{minimization.draft.note}</dd>
              </>
            ) : null}
          </dl>
          <TableRegion label="Minimization sizes table" className="rounded-none border-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sizes.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-mono text-xs">{row.key}</TableCell>
                    <TableCell className="tabular text-right text-xs">
                      {row.before ?? "—"}
                    </TableCell>
                    <TableCell className="tabular text-right text-xs">{row.after ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableRegion>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        <BlobView
          runId={runId}
          digest={minimization.minimized}
          index={blobs}
          label="minimized snapshot"
        />
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>The draft's files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Written in the spec's own formats, which this viewer shows raw and does not read.
            </p>
            {files.map((file) => (
              <DraftFile
                key={file.path}
                runId={runId}
                file={file}
                url={source.url(runId, file.path)}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DraftFile({
  runId,
  file,
  url,
}: {
  runId: string
  file: ReturnType<typeof draftFiles>[number]
  url: string
}) {
  const raw = useRunRaw(runId, file.path, { enabled: file.listed })
  return (
    <details className="rounded-lg border" data-draft-file={file.name}>
      <summary className="cursor-pointer px-3 py-2 text-sm">
        <span className="font-mono">{file.name}</span>
        {file.schema ? (
          <span className="ml-2 text-xs text-muted-foreground">{file.schema}</span>
        ) : null}
        {file.listed ? null : (
          <span className="ml-2 text-xs text-muted-foreground">not in this run</span>
        )}
      </summary>
      {file.listed ? (
        <div className="border-t px-3 py-1.5 text-xs">
          <a
            href={url}
            download
            className="inline-flex min-h-6 items-center underline underline-offset-3"
          >
            download
          </a>
        </div>
      ) : null}
      {file.listed ? (
        raw.isPending ? (
          <Skeleton className="m-3 h-10" />
        ) : raw.isError ? (
          <p className="px-3 py-2 text-xs text-failure">{raw.error.message}</p>
        ) : (
          <pre
            tabIndex={0}
            role="region"
            aria-label={`${file.name} contents`}
            className="max-h-96 overflow-auto border-t px-3 py-2 font-mono text-xs leading-5 whitespace-pre focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {prettyJson(raw.data)}
          </pre>
        )
      ) : null}
    </details>
  )
}
