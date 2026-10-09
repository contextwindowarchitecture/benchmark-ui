import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { PageSection } from "@/components/dashboard/dashboard-page"
import { TableRegion } from "@/components/dashboard/table-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { eventTotal, purityRows, type PurityEvent } from "@/features/d1/model/suite"
import { formatCount } from "@/lib/format"

import { EnvironmentMatrix } from "./environment-matrix"
import type { SuitePanelProps } from "./types"

function Events({
  events,
  harmless = false,
}: {
  events: readonly PurityEvent[]
  harmless?: boolean
}) {
  if (events.length === 0) return <span className="text-muted-foreground">0</span>
  return (
    <details className="text-xs">
      <summary
        className={
          harmless
            ? "cursor-pointer text-muted-foreground"
            : "cursor-pointer font-medium text-failure"
        }
      >
        {formatCount(eventTotal(events))}
        {harmless ? " (harmless)" : ""}
      </summary>
      <ul className="mt-1 space-y-0.5 font-mono">
        {events.map((event) => (
          <li key={event.event} className="break-all">
            {event.event} <span className="text-muted-foreground">×{formatCount(event.count)}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}

/** S10 (ui-plan.md 8.4): what each adapter touched under strace, and the isolation cells. */
export function S10Purity({ summary }: SuitePanelProps) {
  const purity = summary.purity
  const rows = purity ? purityRows(purity) : []
  return (
    <PageSection
      title="Purity and isolation"
      id="panel"
      description="Network, file and process activity each adapter showed under tracing, and whether its answers survive isolation."
    >
      {purity && purity.problems.length > 0 ? (
        <Alert variant="destructive" data-state="problems">
          <AlertTitle>{formatCount(purity.problems.length)} purity problems</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 font-mono text-xs">
              {purity.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {rows.length === 0 ? (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          This run's summary has no purity block.
        </p>
      ) : (
        <TableRegion label="Purity table">
          <Table>
            <TableCaption className="sr-only">Traced events per adapter.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Adapter</TableHead>
                <TableHead scope="col" className="text-right">
                  Traced
                </TableHead>
                <TableHead scope="col">Network</TableHead>
                <TableHead scope="col">Local sockets</TableHead>
                <TableHead scope="col">Reads outside the runtime</TableHead>
                <TableHead scope="col">Writes</TableHead>
                <TableHead scope="col">Cache writes</TableHead>
                <TableHead scope="col">Child processes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.adapter} data-adapter={row.adapter}>
                  <TableCell className="align-top">
                    <AdapterMark adapter={row.adapter} />
                  </TableCell>
                  <TableCell className="tabular text-right align-top text-xs">
                    {formatCount(row.traced)} of {formatCount(row.invocations)}
                    {row.emptyTraces > 0 ? (
                      <div className="text-warning">{formatCount(row.emptyTraces)} empty</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">
                    <Events events={row.network} />
                  </TableCell>
                  <TableCell className="align-top">
                    <Events events={row.localSockets} />
                  </TableCell>
                  <TableCell className="align-top">
                    <Events events={row.reads} />
                  </TableCell>
                  <TableCell className="align-top">
                    <Events events={row.writes} />
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <Events events={row.cacheWrites} />
                      {row.harmlessCacheWrites.length > 0 ? (
                        <Events events={row.harmlessCacheWrites} harmless />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Events events={row.childProcesses} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRegion>
      )}
      {purity ? (
        <Card>
          <CardHeader>
            <CardTitle>What the tracing allows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Reads under{" "}
              <span className="font-mono text-xs">{purity.allowed_read_prefixes.join(" ")}</span>{" "}
              are the runtime's own. Cache writes the read-only root refused (EROFS) are harmless
              and labeled so.
            </p>
            <p className="text-muted-foreground">{purity.clock_note}</p>
          </CardContent>
        </Card>
      ) : null}
      {summary.cells && summary.cells.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-base font-semibold">Isolation cells</h3>
          <EnvironmentMatrix cells={summary.cells} label="Isolation cells matrix" />
        </div>
      ) : null}
    </PageSection>
  )
}
