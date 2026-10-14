// Which runs an evidence page reads (UI-D2; UI-D5): each run, the suites read from it, and its
// size, with the run it stands in for when the run the rule would read is gone.

import { Link } from "react-router"

import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Composite } from "@/features/shared/model/composite"
import { useArmVocabulary } from "@/features/shared/vocabulary"
import { useDomainPages } from "@/lib/domains"
import { formatUtc, isoUtc } from "@/lib/format"

/** Which runs the page reads, each with the suites read from it and its size. */
export function SourcesTable({
  view,
  sizes,
}: {
  view: Composite
  sizes: ReadonlyMap<string, string>
}) {
  const { base } = useDomainPages()
  const { suiteWords } = useArmVocabulary()
  return (
    <TableRegion label="Runs read">
      <Table>
        <TableCaption className="sr-only">
          Each run this page reads, the suites it is read for, and its size.
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
                      to={`${base}/runs/${run.run_id}`}
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
                  {[
                    ...new Set(suites.flatMap((s) => (s.insteadOf ? [s.insteadOf.run_id] : []))),
                  ].map((instead) => (
                    <p key={instead} className="text-xs text-muted-foreground">
                      instead of{" "}
                      <Link
                        to={`${base}/runs/${instead}`}
                        className="font-mono underline underline-offset-3"
                      >
                        {instead}
                      </Link>
                      , pruned
                    </p>
                  ))}
                  <time dateTime={isoUtc(run.started_at)} className="text-xs text-muted-foreground">
                    {formatUtc(run.started_at)}
                  </time>
                </TableCell>
                <TableCell className="align-top">
                  <ul className="flex flex-wrap gap-x-3 gap-y-1">
                    {suites.map((source) => (
                      <li key={source.suite}>
                        <Link
                          to={`${base}/runs/${run.run_id}/suites/${source.suite}`}
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
