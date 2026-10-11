import { ChevronLeft, ChevronRight, Download } from "lucide-react"
import { useMemo, useState } from "react"

import { TableRegion } from "@/components/dashboard/table-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { familyWords } from "@/content/d2/vocabulary"
import { useResultsSource } from "@/data/queries"
import type { RowQuery } from "@/data/row-store"
import { useRowPage, useRows } from "@/data/use-rows"
import { FacetSelect } from "@/features/d1/components/suite-rows"
import { D2_VERDICT_LABELS } from "@/features/d2/model/row-kinds"
import type { SuiteRowFile } from "@/features/d2/model/suite"
import { tierLabel } from "@/features/d2/model/metrics"
import { d2SuitePageParams } from "@/features/d2/model/url"
import { formatBytes, formatCount } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { d2ColumnsOf } from "./row-columns"

/**
 * One of a Domain 2 suite's row files (the UI-D2 plan, ui-plan.md 8.4): loaded on request, through
 * the worker above the main-thread budget and as a download above the worker's, filtered by arm,
 * family, tier, judgment and tag from the URL, and paged.
 */
export function D2SuiteRows({
  runId,
  suite,
  file,
}: {
  runId: string
  suite: string
  file: SuiteRowFile
}) {
  const source = useResultsSource()
  const [state, setState] = useUrlState(d2SuitePageParams)
  const filtering = Boolean(
    state.arm || state.family || state.tier || state.verdict || state.tag || state.q,
  )
  // A filter in the address opens the rows at once; otherwise they load on request.
  const [opened, setOpened] = useState(filtering || state.page !== undefined)
  const handle = useRows(runId, file.path, file.kind, { expectedRows: file.rows, enabled: opened })
  const query = useMemo<RowQuery>(
    () => ({
      filter: {
        arm: state.arm,
        family: state.family,
        tier: state.tier,
        verdict: state.verdict,
        tag: state.tag,
        q: state.q,
      },
      page: state.page ?? 1,
    }),
    [state.arm, state.family, state.tier, state.verdict, state.tag, state.q, state.page],
  )
  const { page, pending, error } = useRowPage(handle, query)
  const facets = page?.facets
  const download = (
    <a
      href={source.url(runId, file.path)}
      download
      className="inline-flex min-h-6 items-center gap-1 text-xs underline underline-offset-3"
    >
      <Download aria-hidden="true" className="size-3.5" /> Download {file.path}
    </a>
  )
  const rowsText = file.rows === undefined ? "rows" : `${formatCount(file.rows)} rows`

  if (!opened) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4 text-sm">
        <span>{rowsText}, loaded on request.</span>
        <Button variant="outline" size="sm" onClick={() => setOpened(true)}>
          Load the rows
        </Button>
        {download}
      </div>
    )
  }
  if (handle.status === "idle" || handle.status === "loading") {
    return (
      <div role="status" aria-label="Loading rows" aria-busy="true" className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (handle.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the rows</AlertTitle>
        <AlertDescription>
          <p>{handle.error.message}</p>
          {handle.error.kind !== "not-found" ? (
            <Button variant="outline" size="sm" onClick={handle.retry}>
              Retry
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    )
  }
  if (handle.status === "over-budget") {
    return (
      <Alert data-state="over-budget">
        <AlertTitle>Too many rows to show here</AlertTitle>
        <AlertDescription>
          <p>
            {formatCount(handle.rows)} rows exceed the {formatCount(handle.budget)}-row budget this
            viewer loads in the browser (ui-plan.md 5.4). The file is there to download; the suite's
            metrics above are the harness's aggregate of it.
          </p>
          {download}
        </AlertDescription>
      </Alert>
    )
  }

  const columns = d2ColumnsOf(file.kind)
  const set = (patch: Record<string, string | number | undefined>) =>
    setState({ ...patch, page: undefined })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(facets?.arms.length ?? 0) > 0 ? (
          <FacetSelect
            label="Arm"
            value={state.arm}
            entries={facets?.arms ?? []}
            render={(value) => value}
            onChange={(arm) => set({ arm })}
          />
        ) : null}
        {(facets?.families.length ?? 0) > 1 ? (
          <FacetSelect
            label="Family"
            value={state.family}
            entries={facets?.families ?? []}
            render={(value) => familyWords(value)?.code ?? value}
            onChange={(family) => set({ family })}
          />
        ) : null}
        {(facets?.tiers.length ?? 0) > 1 ? (
          <FacetSelect
            label="Tier"
            value={state.tier}
            entries={facets?.tiers ?? []}
            render={tierLabel}
            onChange={(tier) => set({ tier })}
          />
        ) : null}
        <FacetSelect
          label={D2_VERDICT_LABELS[file.kind]}
          value={state.verdict}
          entries={facets?.verdicts ?? []}
          render={(value) => value}
          onChange={(verdict) => set({ verdict })}
        />
        {(facets?.tags.length ?? 0) > 1 ? (
          <FacetSelect
            label="Tag"
            value={state.tag}
            entries={facets?.tags ?? []}
            render={(value) => value}
            onChange={(tag) => set({ tag })}
          />
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Search</span>
          <Input
            type="search"
            value={state.q ?? ""}
            onChange={(event) => set({ q: event.target.value || undefined })}
            placeholder="case, conversation or reply"
            className="h-8 w-56"
            aria-label="Search rows"
          />
        </label>
        {filtering ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setState({
                arm: undefined,
                family: undefined,
                tier: undefined,
                verdict: undefined,
                tag: undefined,
                q: undefined,
                page: undefined,
              })
            }
          >
            Clear
          </Button>
        ) : null}
        <p className="ml-auto text-sm text-muted-foreground" aria-live="polite">
          {page
            ? page.matched === page.total
              ? `${formatCount(page.total)} rows`
              : `${formatCount(page.matched)} of ${formatCount(page.total)} rows match`
            : "…"}
          <span className="ml-2 text-xs">
            ({formatBytes(handle.bytes)},{" "}
            {handle.via === "worker" ? "parsed in a worker" : "parsed here"})
          </span>
        </p>
      </div>
      {handle.errors.length > 0 ? (
        <Alert variant="destructive" data-state="row-errors">
          <AlertTitle>
            {formatCount(handle.errors.length)} {handle.errors.length === 1 ? "line" : "lines"} of{" "}
            {file.path} could not be read
          </AlertTitle>
          <AlertDescription>
            <ul className="font-mono text-xs">
              {handle.errors.slice(0, 5).map((e) => (
                <li key={e.line}>
                  line {e.line}: {e.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {handle.unsupported.length > 0 ? (
        <Alert data-state="row-unsupported">
          <AlertTitle>
            {formatCount(handle.unsupported.length)} rows name a schema this viewer does not read
          </AlertTitle>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>The worker could not answer</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}
      {!page && pending ? (
        <Skeleton className="h-64 w-full" aria-label="Loading a page of rows" />
      ) : page && page.total === 0 ? (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          {file.path} has no rows.
        </p>
      ) : page && page.matched === 0 ? (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="no-results"
        >
          No rows match these filters.
        </p>
      ) : page ? (
        <>
          <TableRegion label={`${suite} rows of ${file.path}`}>
            <Table>
              <TableCaption className="sr-only">
                Rows of {file.path}, page {page.page} of {page.pageCount}.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="text-right">
                    Line
                  </TableHead>
                  {columns.map((column) => (
                    <TableHead key={column.id} scope="col" className={column.className}>
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className={pending ? "opacity-60" : undefined}>
                {page.rows.map((row) => (
                  <TableRow key={row.line} data-line={row.line}>
                    <TableCell className="tabular text-right align-top text-xs text-muted-foreground">
                      {formatCount(row.line)}
                    </TableCell>
                    {columns.map((column) => (
                      <TableCell key={column.id} className={`align-top ${column.className ?? ""}`}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableRegion>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={page.page <= 1}
              onClick={() => setState({ page: page.page - 1 })}
            >
              <ChevronLeft aria-hidden="true" /> Previous
            </Button>
            <span className="tabular text-muted-foreground" aria-live="polite">
              Page {formatCount(page.page)} of {formatCount(page.pageCount)} · rows{" "}
              {formatCount((page.page - 1) * page.pageSize + 1)} to{" "}
              {formatCount(Math.min(page.page * page.pageSize, page.matched))}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page.page >= page.pageCount}
              onClick={() => setState({ page: page.page + 1 })}
            >
              Next <ChevronRight aria-hidden="true" />
            </Button>
            <span className="ml-auto">{download}</span>
          </div>
        </>
      ) : null}
    </div>
  )
}
