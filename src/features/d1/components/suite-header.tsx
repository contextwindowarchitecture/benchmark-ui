import { Download } from "lucide-react"
import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useResultsSource } from "@/data/queries"
import type { ContractV1, RunIndexV1, SuiteSummaryV1 } from "@/data/schema/generated"
import { adapterTallies, requirementChips, suiteFile } from "@/features/d1/model/suite"
import { adapterLabel } from "@/lib/adapters"
import { formatCount, formatMs, formatRate } from "@/lib/format"

export type SuiteHeaderProps = {
  runId: string
  suite: string
  summary: SuiteSummaryV1
  /** The contract, once it has loaded; the chips show ids alone until then. */
  contract: ContractV1 | undefined
  index: RunIndexV1
  /** This suite's findings, from the run summary. */
  findings: number
}

/** The common header of every suite (ui-plan.md 8.4): requirements, corpora, files, tallies. */
export function SuiteHeader({
  runId,
  suite,
  summary,
  contract,
  index,
  findings,
}: SuiteHeaderProps) {
  const source = useResultsSource()
  const chips = requirementChips(summary.requirements, contract)
  const tallies = adapterTallies(summary)
  const results = suiteFile(index, suite, "results.jsonl")
  const findingsFile = suiteFile(index, suite, "findings.jsonl")
  const downloads: { label: string; path: string }[] = []
  if (results)
    downloads.push({
      label: `results.jsonl (${formatCount(results.rows ?? 0)} rows)`,
      path: results.path,
    })
  if (findingsFile)
    downloads.push({ label: `findings.jsonl (${formatCount(findings)})`, path: findingsFile.path })
  for (const adapter of tallies) {
    if (adapter.report)
      downloads.push({
        label: `${adapterLabel(adapter.adapter)} conformance report`,
        path: adapter.report,
      })
  }
  if (summary.goldens?.candidates) {
    downloads.push({
      label: `candidate goldens (${formatCount(summary.goldens.candidate_count)})`,
      path: summary.goldens.candidates,
    })
  }
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {chips.length === 0 ? (
              <p className="text-sm text-muted-foreground">This suite names no requirement.</p>
            ) : (
              <>
                <ul className="flex flex-wrap gap-1" aria-label="Requirements covered">
                  {chips.map((chip) => (
                    <li key={chip.id}>
                      <Badge
                        variant="outline"
                        className="font-mono text-[0.7rem]"
                        title={chip.summary ?? undefined}
                      >
                        {chip.id}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">
                    {contract ? "What each requires" : "Loading the contract's words…"}
                  </summary>
                  <dl className="mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)]">
                    {chips.map((chip) => (
                      <div key={chip.id} className="contents">
                        <dt className="font-mono text-xs">{chip.id}</dt>
                        <dd className="text-xs">
                          {chip.summary ?? <span className="text-muted-foreground">—</span>}
                          {chip.keyword ? (
                            <span className="ml-1 text-muted-foreground">
                              ({chip.keyword}
                              {chip.scope ? `, ${chip.scope}` : ""})
                            </span>
                          ) : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Corpora</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.corpora.length === 0 ? (
              <p className="text-sm text-muted-foreground">No corpus.</p>
            ) : (
              <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">
                {summary.corpora.map((corpus) => (
                  <div key={corpus.id} className="contents">
                    <dt className="font-mono text-xs">{corpus.id}</dt>
                    <dd className="tabular text-right">{formatCount(corpus.count)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Files</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {downloads.map((file) => (
                <li key={file.path}>
                  <a
                    href={source.url(runId, file.path)}
                    download
                    className="inline-flex min-h-6 items-center gap-1 underline underline-offset-3"
                  >
                    <Download aria-hidden="true" className="size-3.5" /> {file.label}
                  </a>
                </li>
              ))}
              {findings > 0 ? (
                <li>
                  <Link
                    to={`/d1/runs/${runId}/findings?suite=${suite}`}
                    className="underline underline-offset-3"
                  >
                    {formatCount(findings)} {findings === 1 ? "finding" : "findings"} in this suite
                  </Link>
                </li>
              ) : (
                <li className="text-muted-foreground">No findings in this suite.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
      {tallies.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Per adapter</CardTitle>
          </CardHeader>
          <CardContent>
            <TableRegion label="Adapter tallies table" className="rounded-none border-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Adapter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cases</TableHead>
                    <TableHead className="text-right">Rejections</TableHead>
                    <TableHead>Outcomes</TableHead>
                    <TableHead className="text-right">Committed report</TableHead>
                    <TableHead className="text-right">Wall p50 / p95 / max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tallies.map((adapter) => (
                    <TableRow key={adapter.adapter} data-adapter={adapter.adapter}>
                      <TableCell className="align-top">
                        <AdapterMark adapter={adapter.adapter} />
                      </TableCell>
                      <TableCell className="align-top">
                        <StatusBadge status={adapter.status} />
                        {adapter.error ? (
                          <div className="text-xs text-failure">{adapter.error}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular text-right align-top">
                        {adapter.cases
                          ? formatRate(
                              adapter.cases.total === 0
                                ? null
                                : adapter.cases.passed / adapter.cases.total,
                              adapter.cases.passed,
                              adapter.cases.total,
                            )
                          : "—"}
                        {adapter.cases &&
                        (adapter.cases.failed > 0 || adapter.cases.skipped > 0) ? (
                          <div className="text-xs text-muted-foreground">
                            {adapter.cases.failed} failed · {adapter.cases.skipped} skipped
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular text-right align-top">
                        {adapter.rejections
                          ? formatRate(
                              adapter.rejections.total === 0
                                ? null
                                : adapter.rejections.rejected / adapter.rejections.total,
                              adapter.rejections.rejected,
                              adapter.rejections.total,
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        {Object.entries(adapter.outcomes)
                          .filter((pair): pair is [string, number] => typeof pair[1] === "number")
                          .map(([outcome, count]) => `${formatCount(count)} ${outcome}`)
                          .join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="tabular text-right align-top">
                        {adapter.committed_report ? (
                          <>
                            {formatCount(adapter.committed_report.matches)} /{" "}
                            {formatCount(adapter.committed_report.total)}
                            <div className="text-xs text-muted-foreground">
                              {adapter.committed_report.cases_unchanged_since === false
                                ? "cases changed since"
                                : adapter.committed_report.differs.length > 0
                                  ? `${formatCount(adapter.committed_report.differs.length)} differ`
                                  : "all match"}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="tabular text-right align-top text-xs">
                        {adapter.wall_ms.p50 === null
                          ? "—"
                          : `${formatMs(adapter.wall_ms.p50)} / ${formatMs(adapter.wall_ms.p95 ?? 0)} / ${formatMs(adapter.wall_ms.max ?? 0)}`}
                        <div className="text-muted-foreground">
                          {formatCount(adapter.wall_ms.count)} invocations
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableRegion>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
