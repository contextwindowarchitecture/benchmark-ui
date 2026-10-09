import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { PageSection } from "@/components/dashboard/dashboard-page"
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
import { MetricCards } from "@/features/d1/components/metric-card"
import { labeledCorpora } from "@/features/d1/model/suite"
import { formatCount, formatRate } from "@/lib/format"

import { OpenBlockNote } from "./open-block-note"
import { crossMetrics, type SuitePanelProps } from "./types"

/** S6, S8 and S9 (ui-plan.md 8.4): the labeled corpora table. */
export function LabeledCorpora({ summary }: SuitePanelProps) {
  const labeled = summary.labeled
  const rows = labeled ? labeledCorpora(labeled) : []
  return (
    <PageSection
      title="Labeled corpora"
      id="panel"
      description="Snapshots whose labeled expectation each adapter met, corpus by corpus."
    >
      <MetricCards metrics={crossMetrics(summary)} />
      {rows.length === 0 ? (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          This run's summary has no labeled corpora.
        </p>
      ) : (
        <TableRegion label="Labeled corpora table">
          <Table>
            <TableCaption className="sr-only">
              Snapshots passed per corpus and adapter.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Corpus</TableHead>
                <TableHead scope="col">Adapter</TableHead>
                <TableHead scope="col" className="text-right">
                  Snapshots
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Passed
                </TableHead>
                <TableHead scope="col">Outcomes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.corpus}|${row.adapter}`} data-corpus={row.corpus}>
                  <TableCell className="font-mono text-xs">{row.corpus}</TableCell>
                  <TableCell>
                    <AdapterMark adapter={row.adapter} />
                  </TableCell>
                  <TableCell className="tabular text-right">{formatCount(row.snapshots)}</TableCell>
                  <TableCell className="tabular text-right">
                    {formatRate(row.rate, row.passed, row.snapshots)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {Object.entries(row.outcomes)
                      .filter((pair): pair is [string, number] => typeof pair[1] === "number")
                      .map(([outcome, n]) => `${formatCount(n)} ${outcome}`)
                      .join(" · ") || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRegion>
      )}
      {labeled ? (
        <p className="text-sm text-muted-foreground">
          {labeled.disagreements.length === 0
            ? "No snapshot on which the adapters disagree."
            : `${formatCount(labeled.disagreements.length)} snapshots on which the adapters disagree; the rows name them.`}
        </p>
      ) : null}
      {labeled && (labeled.precedence || labeled.refusal_matrix || labeled.degradation) ? (
        <OpenBlockNote
          what="The precedence pairs, the refusal matrix and the degradation ladder"
          ask="Section 14 asks the harness to type those blocks of the labeled summary."
        />
      ) : null}
    </PageSection>
  )
}
