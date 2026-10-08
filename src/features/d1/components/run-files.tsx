import { Download } from "lucide-react"

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
import { useResultsSource } from "@/data/queries"
import type { RunIndexV1 } from "@/data/schema/generated"
import { fileRows } from "@/features/d1/model/run"
import { formatCount } from "@/lib/format"

/** The run's file list from index.json, with kind, schema, rows and a download link. */
export function RunFiles({ runId, index }: { runId: string; index: RunIndexV1 }) {
  const source = useResultsSource()
  const rows = fileRows(index)
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {formatCount(rows.length)} files, plus {formatCount(index.blobs.count)} blobs under{" "}
        <span className="font-mono">{index.blobs.layout}</span> (indexed in{" "}
        <a
          href={source.url(runId, index.blobs.index)}
          className="font-mono underline underline-offset-3"
          download
        >
          {index.blobs.index}
        </a>
        ).
      </p>
      <div
        className="overflow-x-auto rounded-lg border"
        role="region"
        aria-label="Files table"
        tabIndex={0}
      >
        <Table>
          <TableCaption className="sr-only">
            Files of the run, with their schema and row counts.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Path</TableHead>
              <TableHead scope="col">Kind</TableHead>
              <TableHead scope="col">Schema</TableHead>
              <TableHead scope="col" className="text-right">
                Rows
              </TableHead>
              <TableHead scope="col">Description</TableHead>
              <TableHead scope="col">
                <span className="sr-only">Download</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((file) => (
              <TableRow key={file.path} data-path={file.path}>
                <TableCell className="font-mono text-xs break-all">{file.path}</TableCell>
                <TableCell className="text-xs">{file.kind}</TableCell>
                <TableCell className="text-xs">
                  {file.schema ? (
                    <span className="inline-flex flex-wrap items-center gap-1">
                      <span className="font-mono">{file.schema}</span>
                      {file.readAs ? null : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                          title="This build does not read this schema"
                        >
                          not read
                        </Badge>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">none</span>
                  )}
                </TableCell>
                <TableCell className="tabular text-right text-xs">
                  {file.rows === undefined ? "" : formatCount(file.rows)}
                </TableCell>
                <TableCell className="max-w-md text-xs text-muted-foreground">
                  {file.description}
                </TableCell>
                <TableCell>
                  <a
                    href={source.url(runId, file.path)}
                    download
                    className="inline-flex items-center gap-1 text-xs underline underline-offset-3"
                    aria-label={`Download ${file.path}`}
                  >
                    <Download aria-hidden="true" className="size-3.5" /> download
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
