import { ExternalLink } from "lucide-react"
import { Link } from "react-router"

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
import { DEFECTS, DEFECTS_CITATION, DEFECTS_NOTE, sourceUrl } from "@/content"

/** The defects the benchmark found (ui-plan.md 8.1, item 4): content, each linking to the record. */
export function DefectsTable() {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{DEFECTS_NOTE}</p>
      <TableRegion label="Defects table">
        <Table>
          <TableCaption className="sr-only">
            Each defect, where it was, how it was found, where it was reported, and the findings
            that recorded it.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Where</TableHead>
              <TableHead scope="col">Defect</TableHead>
              <TableHead scope="col">Found by</TableHead>
              <TableHead scope="col">Reported</TableHead>
              <TableHead scope="col">Recorded as</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEFECTS.map((defect) => (
              <TableRow key={defect.id} data-defect={defect.id}>
                <TableCell scope="row" className="align-top font-medium">
                  {defect.where}
                </TableCell>
                <TableCell className="max-w-md align-top text-xs">{defect.defect}</TableCell>
                <TableCell className="max-w-xs align-top text-xs text-muted-foreground">
                  {defect.foundBy}
                </TableCell>
                <TableCell className="align-top text-xs">
                  <a
                    href={defect.issue.url}
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-3"
                  >
                    {defect.issue.label}
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                </TableCell>
                <TableCell className="align-top text-xs">
                  {defect.findings.length === 0 ? (
                    <span className="text-muted-foreground">no finding in a published run</span>
                  ) : (
                    <ul className="space-y-1">
                      {defect.findings.map((pointer) => (
                        <li key={pointer.finding}>
                          <Link
                            to={`/d1/runs/${pointer.run}/findings/${pointer.finding}`}
                            className="inline-flex min-h-6 items-center font-mono underline underline-offset-3"
                            title={`finding ${pointer.finding} in run ${pointer.run}`}
                          >
                            {pointer.finding}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRegion>
      <p className="text-xs text-muted-foreground">
        Words from{" "}
        <a
          href={sourceUrl(DEFECTS_CITATION.file)}
          rel="noreferrer"
          className="underline underline-offset-3"
        >
          {DEFECTS_CITATION.file}
        </a>
        , {DEFECTS_CITATION.section}; the finding ids are those of the run that recorded each
        defect.
      </p>
    </div>
  )
}
