import { ChevronLeft, ChevronRight, Download } from "lucide-react"
import { useId, useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { TableRegion } from "@/components/dashboard/table-region"
import { useResultsSource } from "@/data/queries"
import type { FacetEntry, RowQuery } from "@/data/row-store"
import type { RunIndexV1 } from "@/data/schema/generated"
import { useRowPage, useRows } from "@/data/use-rows"
import { VERDICT_LABELS, type RowKind } from "@/features/d1/model/row-kinds"
import { suitePageParams } from "@/features/d1/model/url"
import { adapterLabel } from "@/lib/adapters"
import { formatBytes, formatCount } from "@/lib/format"
import { outcomeLabel } from "@/lib/outcomes"
import { useUrlState } from "@/lib/url-state"

import { columnsOf } from "./row-columns"

const ALL = "all"

export type SuiteRowsProps = {
  runId: string
  /** The suite the rows belong to, or a label for a file that spans suites ("findings"). */
  suite: string
  kind: RowKind
  /** The file as the run index lists it. */
  file: RunIndexV1["files"][number]
  /** Load at once rather than on request: the findings list is its page's content. */
  autoOpen?: boolean
}

/**
 * The suite's rows (ui-plan.md 8.4): loaded on demand, filtered by adapter, verdict, outcome, case
 * and coverage tag from the URL, paged, each row linking to the answer explorer where blobs exist.
 */
export function SuiteRows({ runId, suite, kind, file, autoOpen = false }: SuiteRowsProps) {
  const source = useResultsSource()
  const [state, setState] = useUrlState(suitePageParams)
  const filtering = Boolean(
    state.adapter ||
    state.verdict ||
    state.outcome ||
    state.tag ||
    state.q ||
    state.finding ||
    state.suite ||
    state.oracle,
  )
  // A filter in the address (a matrix cell's link) opens the rows at once; otherwise on request.
  const [opened, setOpened] = useState(autoOpen || filtering || state.page !== undefined)
  const handle = useRows(runId, file.path, kind, { expectedRows: file.rows, enabled: opened })
  const query = useMemo<RowQuery>(
    () => ({
      filter: {
        adapter: state.adapter,
        verdict: state.verdict,
        outcome: state.outcome,
        tag: state.tag,
        finding: state.finding,
        suite: state.suite,
        oracle: state.oracle,
        q: state.q,
      },
      page: state.page ?? 1,
    }),
    [
      state.adapter,
      state.verdict,
      state.outcome,
      state.tag,
      state.finding,
      state.suite,
      state.oracle,
      state.q,
      state.page,
    ],
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
        <span>
          {rowsText} of <span className="font-mono">{kind}</span>, loaded on request.
        </span>
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
            viewer loads in the browser (ui-plan.md 5.4). The file is there to download; an
            aggregate is the harness's to add.
          </p>
          {download}
        </AlertDescription>
      </Alert>
    )
  }

  const columns = columnsOf(kind)
  const context = { runId, suite }
  const set = (patch: Record<string, string | number | undefined>) =>
    setState({ ...patch, page: undefined })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <FacetSelect
          label="Adapter"
          value={state.adapter}
          entries={facets?.adapters ?? []}
          render={adapterLabel}
          onChange={(adapter) => set({ adapter })}
        />
        <FacetSelect
          label={VERDICT_LABELS[kind]}
          value={state.verdict}
          entries={facets?.verdicts ?? []}
          render={(value) => (kind === "determinism-row" ? outcomeLabel(value) : value)}
          onChange={(verdict) => set({ verdict })}
        />
        {kind === "finding" ? (
          <>
            <FacetSelect
              label="Suite"
              value={state.suite}
              entries={facets?.suites ?? []}
              render={(value) => value}
              onChange={(suite) => set({ suite })}
            />
            <FacetSelect
              label="Oracle"
              value={state.oracle}
              entries={facets?.oracles ?? []}
              render={(value) => value}
              onChange={(oracle) => set({ oracle })}
            />
          </>
        ) : null}
        {kind !== "determinism-row" && (facets?.outcomes.length ?? 0) > 0 ? (
          <FacetSelect
            label="Outcome"
            value={state.outcome}
            entries={facets?.outcomes ?? []}
            render={outcomeLabel}
            onChange={(outcome) => set({ outcome })}
          />
        ) : null}
        {(facets?.tags.length ?? 0) > 0 ? (
          <TagFilter
            value={state.tag}
            entries={facets?.tags ?? []}
            onChange={(tag) => set({ tag })}
          />
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Search</span>
          <Input
            type="search"
            value={state.q ?? ""}
            onChange={(event) => set({ q: event.target.value || undefined })}
            placeholder="case id"
            className="h-8 w-48"
            aria-label="Search rows by case"
          />
        </label>
        {filtering ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setState({
                adapter: undefined,
                verdict: undefined,
                outcome: undefined,
                tag: undefined,
                finding: undefined,
                suite: undefined,
                oracle: undefined,
                q: undefined,
                page: undefined,
              })
            }
          >
            Clear
          </Button>
        ) : null}
        {state.finding ? (
          <span className="text-xs text-muted-foreground">
            rows carrying finding <span className="font-mono">{state.finding}</span>
          </span>
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
          <TableRegion label={`${suite} rows table`}>
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
                        {column.cell(row, context)}
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

function FacetSelect({
  label,
  value,
  entries,
  render,
  onChange,
}: {
  label: string
  value: string | undefined
  entries: FacetEntry[]
  render: (value: string) => string
  onChange: (value: string | undefined) => void
}) {
  // A value the facets no longer offer (a stale address) stays selectable, so the URL is honoured.
  const options =
    value && !entries.some((e) => e.value === value) ? [...entries, { value, count: 0 }] : entries
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Select
        value={value ?? ALL}
        onValueChange={(next) => onChange(next === ALL ? undefined : next)}
      >
        <SelectTrigger
          size="sm"
          className="min-w-32"
          aria-label={`Filter rows by ${label.toLowerCase()}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((entry) => (
            <SelectItem key={entry.value} value={entry.value}>
              {render(entry.value)}{" "}
              <span className="tabular text-muted-foreground">({formatCount(entry.count)})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

/** Coverage tags run to hundreds, so the filter is a text field with the tags as suggestions. */
function TagFilter({
  value,
  entries,
  onChange,
}: {
  value: string | undefined
  entries: FacetEntry[]
  onChange: (value: string | undefined) => void
}) {
  const listId = useId()
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Tag</span>
      <Input
        type="text"
        list={listId}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || undefined)}
        placeholder={`${formatCount(entries.length)} tags`}
        className="h-8 w-56 font-mono text-xs"
        aria-label="Filter rows by coverage tag"
      />
      <datalist id={listId}>
        {entries.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {formatCount(entry.count)}
          </option>
        ))}
      </datalist>
    </label>
  )
}
