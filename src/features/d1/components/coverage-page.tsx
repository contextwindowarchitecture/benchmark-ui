import { TriangleAlert } from "lucide-react"
import { useMemo } from "react"
import { Link, useParams } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { RateMatrix, RateMatrixLegend, type MatrixColumn } from "@/components/dashboard/rate-matrix"
import { AdapterMark } from "@/components/dashboard/adapter-mark"
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
import { documentOf, useRunDocument, useRunDocuments } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { ContractV1, CoverageV1, RunIndexV1 } from "@/data/schema/generated"
import {
  countUnexercised,
  coverageAdapters,
  reasonMatrices,
  requirementGroups,
  tagFamilies,
  tagRows,
} from "@/features/d1/model/coverage"
import { parseRunId } from "@/features/d1/model/runs"
import { coveragePageParams } from "@/features/d1/model/url"
import { adapterLabel } from "@/lib/adapters"
import { formatCount } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

const ALL = "all"

/**
 * What the run covered (ui-plan.md 8.5): requirements × adapters grouped by scope, reasons × slots
 * per adapter, and the tags by family, each a rate matrix with its counts in the text.
 */
export function CoveragePage() {
  const { runId = "" } = useParams()
  const parts = parseRunId(runId)
  const index = useRunDocument(parts ? runId : undefined, "index.json", "run-index")
  const runIndex = documentOf(index.data)
  const listed = runIndex?.files.some((file) => file.path === "coverage.json") ?? false
  const coverage = useRunDocument(runId, "coverage.json", "coverage", { enabled: listed })
  const contract = useRunDocument(runId, "contract.json", "contract", { enabled: listed })
  const summary = useRunDocument(runId, "summary.json", "summary", { enabled: listed })
  const suitePaths = useMemo(
    () => (summary.data?.ok ? summary.data.document.suites.map((suite) => suite.summary) : []),
    [summary.data],
  )
  const suiteSummaries = useRunDocuments(runId, suitePaths, "suite-summary")
  const suiteRequirements = useMemo(() => {
    const map = new Map<string, readonly string[]>()
    for (const result of suiteSummaries) {
      if (result.data?.ok) map.set(result.data.document.suite, result.data.document.requirements)
    }
    return map
  }, [suiteSummaries])

  const indexRegion: RegionState<RunIndexV1> = parts
    ? regionOfDocument(index, `${runId}/index.json`, `Run ${runId}`)
    : { status: "empty", message: `${runId} is not a run id.` }

  return (
    <DashboardPage
      title="Coverage"
      width="wide"
      description={
        <span>
          What run{" "}
          <Link to={`/d1/runs/${runId}`} className="font-mono underline underline-offset-3">
            {runId}
          </Link>{" "}
          exercised and passed, per requirement, reason and tag, from its coverage document.
        </span>
      }
    >
      <DataRegion
        state={indexRegion}
        label="the run"
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        {(run) => {
          if (!listed) {
            return (
              <DataRegion state={{ status: "absent", what: "coverage.json" }} label="coverage">
                {() => null}
              </DataRegion>
            )
          }
          const region = regionOfDocument(coverage, `${runId}/coverage.json`, "Coverage")
          return (
            <DataRegion
              state={region}
              label="coverage"
              skeleton={<Skeleton className="h-96 w-full" />}
            >
              {(document) => (
                <Coverage
                  runId={runId}
                  run={run}
                  coverage={document}
                  contract={documentOf(contract.data)}
                  suiteRequirements={suiteRequirements}
                  suitesPending={suiteSummaries.some((result) => result.isPending)}
                />
              )}
            </DataRegion>
          )
        }}
      </DataRegion>
    </DashboardPage>
  )
}

function Coverage({
  runId,
  coverage,
  contract,
  suiteRequirements,
  suitesPending,
}: {
  runId: string
  run: RunIndexV1
  coverage: CoverageV1
  contract: ContractV1 | undefined
  suiteRequirements: ReadonlyMap<string, readonly string[]>
  suitesPending: boolean
}) {
  const [state, setState] = useUrlState(coveragePageParams)
  const adapters = coverageAdapters(coverage)
  const adapterColumns: MatrixColumn[] = adapters.map((adapter) => ({
    id: adapter,
    label: <AdapterMark adapter={adapter} />,
    name: adapterLabel(adapter),
  }))
  const groups = requirementGroups(coverage, contract, suiteRequirements)
  const matrices = reasonMatrices(coverage, contract)
  const matrixAdapter =
    state.adapter && adapters.includes(state.adapter) ? state.adapter : (adapters[0] ?? "")
  const matrix = matrices.find((m) => m.adapter === matrixAdapter)
  const families = tagFamilies(coverage)
  const family =
    state.family && families.some((f) => f.family === state.family) ? state.family : undefined
  const tags = tagRows(coverage, family)
  const unexercised = countUnexercised(tags)

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
      <p className="text-sm text-muted-foreground">
        Unit: {coverage.unit}. Sources: {coverage.sources.join(", ")}.
      </p>
      {coverage.unknown_reasons.length > 0 ? (
        <Alert data-state="unknown-reasons">
          <TriangleAlert className="text-warning" />
          <AlertTitle>
            {formatCount(coverage.unknown_reasons.length)} reason codes the contract does not know
          </AlertTitle>
          <AlertDescription>
            <span className="font-mono text-xs">{coverage.unknown_reasons.join(", ")}</span>
          </AlertDescription>
        </Alert>
      ) : null}
      <PageSection
        title="Requirements × adapters"
        id="requirements"
        description="Rows judged under each requirement that passed, by scope; the contract's summary on hover and the suites that exercise it."
      >
        <div className="grid gap-6">
          {groups.map((group) => (
            <div key={group.scope ?? "none"} className="space-y-2">
              <h3 className="text-base font-semibold capitalize">
                {group.scope ?? "no scope"}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {formatCount(group.rows.length)}
                </span>
              </h3>
              <RateMatrix
                rowHeader="Requirement"
                columns={adapterColumns}
                caption={`Requirements of scope ${group.scope ?? "none"} per adapter.`}
                label={`Requirements ${group.scope ?? "none"} matrix`}
                rows={group.rows.map((row) => ({
                  id: row.id,
                  name: row.summary ? `${row.id} ${row.summary}` : row.id,
                  cells: row.byAdapter,
                  label: (
                    <div className="min-w-0" title={row.summary ?? undefined}>
                      <span className="font-mono text-xs">{row.id}</span>
                      {row.keyword ? (
                        <span className="ml-1 text-xs text-muted-foreground">{row.keyword}</span>
                      ) : null}
                      {row.summary ? <div className="max-w-xs text-xs">{row.summary}</div> : null}
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {row.suites.length === 0 ? (
                          <span className="text-[0.7rem] text-muted-foreground">
                            {suitesPending ? "…" : "no suite names it"}
                          </span>
                        ) : (
                          row.suites.map((suite) => (
                            <Link key={suite} to={`/d1/runs/${runId}/suites/${suite}`}>
                              <Badge variant="outline" className="font-mono text-[0.7rem]">
                                {suite}
                              </Badge>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  ),
                }))}
              />
            </div>
          ))}
          <RateMatrixLegend />
        </div>
      </PageSection>
      <PageSection
        title="Reasons × slots"
        id="reasons"
        description="Each exclusion and refusal reason the contract names, by the slot of the item it applied to, in the contract's order."
        actions={
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Adapter</span>
            <Select value={matrixAdapter} onValueChange={(value) => setState({ adapter: value })}>
              <SelectTrigger size="sm" className="w-36" aria-label="Adapter of the reasons matrix">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adapters.map((adapter) => (
                  <SelectItem key={adapter} value={adapter}>
                    {adapterLabel(adapter)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        }
      >
        {matrix ? (
          <div className="space-y-2">
            <RateMatrix
              rowHeader="Reason"
              columns={[
                { id: "__total", label: "All slots", name: "all slots" },
                ...matrix.slots.map((slot) => ({
                  id: slot,
                  label: <span className="font-mono text-[0.7rem]">{slot}</span>,
                  name: slot,
                })),
              ]}
              caption={`Reasons by slot for ${adapterLabel(matrix.adapter)}.`}
              label={`Reasons by slot matrix for ${adapterLabel(matrix.adapter)}`}
              rows={matrix.rows.map((row) => ({
                id: row.code,
                name: row.code,
                cells: new Map([["__total", row.total], ...row.bySlot]),
                label: (
                  <div className="min-w-0" title={row.text ?? undefined}>
                    <span className="font-mono text-xs">{row.code}</span>
                    <div className="text-[0.7rem] text-muted-foreground">
                      {row.kind}
                      {row.rule ? ` · ${row.rule}` : ""} · order {row.order}
                    </div>
                  </div>
                ),
              }))}
            />
            <RateMatrixLegend />
          </div>
        ) : (
          <p
            className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
            data-state="empty"
          >
            No reasons in this run's coverage.
          </p>
        )}
      </PageSection>
      <PageSection
        title="Tags"
        id="tags"
        description="Every coverage tag some trace exercised, the unexercised ones first."
        actions={
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Family</span>
            <Select
              value={family ?? ALL}
              onValueChange={(value) => setState({ family: value === ALL ? undefined : value })}
            >
              <SelectTrigger size="sm" className="w-44" aria-label="Filter tags by family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All families</SelectItem>
                {families.map((entry) => (
                  <SelectItem key={entry.family} value={entry.family}>
                    {entry.family}{" "}
                    <span className="tabular text-muted-foreground">
                      ({formatCount(entry.count)})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        }
      >
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {formatCount(tags.length)} tags
          {family ? ` in ${family}` : ""}
          {unexercised > 0
            ? `, ${formatCount(unexercised)} exercised by no adapter`
            : ", every one exercised"}
          .
        </p>
        {tags.length === 0 ? (
          <p
            className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
            data-state="empty"
          >
            No tags in this run's coverage.
          </p>
        ) : (
          <div className="space-y-2">
            <RateMatrix
              rowHeader="Tag"
              columns={adapterColumns}
              caption="Coverage tags per adapter."
              label="Tags matrix"
              rows={tags.map((row) => ({
                id: row.tag,
                name: row.tag,
                cells: row.byAdapter,
                label: (
                  <span
                    className="font-mono text-xs break-all"
                    data-unexercised={row.unexercised || undefined}
                  >
                    {row.tag}
                  </span>
                ),
              }))}
            />
            <RateMatrixLegend />
          </div>
        )}
      </PageSection>
    </div>
  )
}
