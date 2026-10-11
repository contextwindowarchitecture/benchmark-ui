import { Download } from "lucide-react"
import { useState } from "react"

import { TableRegion } from "@/components/dashboard/table-region"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import type { DocumentIn } from "@/data/kinds"
import { fileRows, groupFiles, type FileGroup, type FileRow } from "@/features/d1/model/run"
import { formatCount } from "@/lib/format"

/** How many files of a large kind one "list more" shows. */
const GROUP_PAGE = 200

/**
 * The run's file list from index.json, with kind, schema, rows and a download link. A kind with
 * more files than the table lists at once is one row, listed on request a page at a time.
 */
export function RunFiles({ runId, index }: { runId: string; index: DocumentIn<"run-index"> }) {
  const source = useResultsSource()
  const rows = fileRows(index)
  const { listed, groups } = groupFiles(rows)
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
      <TableRegion label="Files table">
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
            {listed.map((file) => (
              <FileTableRow key={file.path} runId={runId} file={file} />
            ))}
            {groups.map((group) => (
              <GroupRows key={group.kind} runId={runId} group={group} />
            ))}
          </TableBody>
        </Table>
      </TableRegion>
    </div>
  )
}

function FileTableRow({ runId, file }: { runId: string; file: FileRow }) {
  const source = useResultsSource()
  return (
    <TableRow data-path={file.path}>
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
      <TableCell className="max-w-md text-xs text-muted-foreground">{file.description}</TableCell>
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
  )
}

/** A kind of many files: one row saying how many and where, then its files a page at a time. */
function GroupRows({ runId, group }: { runId: string; group: FileGroup }) {
  const [shown, setShown] = useState(0)
  const first = group.files[0]
  const more = Math.min(GROUP_PAGE, group.files.length - shown)
  return (
    <>
      <TableRow data-kind-group={group.kind}>
        <TableCell className="font-mono text-xs break-all">
          {group.prefix || "(the run's root)"}…
        </TableCell>
        <TableCell className="text-xs">{group.kind}</TableCell>
        <TableCell className="text-xs">
          {first?.schema ? <span className="font-mono">{first.schema}</span> : null}
        </TableCell>
        <TableCell />
        <TableCell className="text-xs text-muted-foreground">
          {formatCount(group.files.length)} {group.kind} files, too many to list at once.
          {shown > 0 ? ` ${formatCount(shown)} listed below.` : ""}
        </TableCell>
        <TableCell>
          {more > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShown(shown + more)}
              aria-label={`List ${formatCount(more)} more ${group.kind} files`}
            >
              List {formatCount(more)} more
            </Button>
          ) : null}
        </TableCell>
      </TableRow>
      {group.files.slice(0, shown).map((file) => (
        <FileTableRow key={file.path} runId={runId} file={file} />
      ))}
    </>
  )
}
