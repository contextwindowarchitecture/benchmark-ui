import { Link } from "react-router"

import { StatusBadge } from "@/components/dashboard/status-badge"
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
import { suiteWords } from "@/content/d2/vocabulary"
import type { D2SummaryV1 } from "@/data/schema/generated"
import { compareSuites } from "@/features/d1/model/runs"
import { formatCount } from "@/lib/format"

/** The run's suites (ui-plan.md 8.3 for Domain 2): status, what each is for, findings, the page. */
export function D2RunSuites({ runId, summary }: { runId: string; summary: D2SummaryV1 }) {
  const suites = [...summary.suites].sort((a, b) => compareSuites(a.id, b.id))
  if (suites.length === 0) {
    return (
      <p
        className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        data-state="empty"
      >
        This run ran no suites.
      </p>
    )
  }
  return (
    <TableRegion label="Suites table">
      <Table>
        <TableCaption className="sr-only">
          The run's suites with their status, what each is for and its findings.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Suite</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">What it is for</TableHead>
            <TableHead scope="col" className="text-right">
              Findings
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suites.map((suite) => (
            <TableRow key={suite.id} data-suite={suite.id}>
              <TableCell className="align-top">
                <Link
                  to={`/d2/runs/${runId}/suites/${suite.id}`}
                  className="underline underline-offset-3"
                >
                  <span className="font-mono">{suite.id}</span> · {suite.title}
                </Link>
              </TableCell>
              <TableCell className="align-top">
                <StatusBadge status={suite.status} />
              </TableCell>
              <TableCell className="max-w-prose align-top text-sm text-muted-foreground">
                {suiteWords(suite.id) ?? "—"}
              </TableCell>
              <TableCell className="tabular text-right align-top">
                {formatCount(summary.findings.by_suite[suite.id] ?? 0)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableRegion>
  )
}
