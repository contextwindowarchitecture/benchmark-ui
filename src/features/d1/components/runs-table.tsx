import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { StatusBadge } from "@/components/dashboard/status-badge"
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
import { useRunDocument } from "@/data/queries"
import { compareSuites, parseRunId, runDurationMs, type RunEntry } from "@/features/d1/model/runs"
import { commitsOf, type RunsSortKey } from "@/features/d1/model/runs-table"
import { ADAPTER_IDS, adapterLabel, orderAdapters } from "@/lib/adapters"
import { formatDuration, formatUtc, isoUtc, shortDigest } from "@/lib/format"

export type RunsTableProps = {
  runs: RunEntry[]
  sort: RunsSortKey
  dir: "asc" | "desc"
  onSort: (key: RunsSortKey) => void
}

const COLUMNS: { key: RunsSortKey | null; label: string; className?: string }[] = [
  { key: "started", label: "Run" },
  { key: "status", label: "Status" },
  { key: "profile", label: "Profile" },
  { key: "duration", label: "Duration", className: "text-right" },
  { key: null, label: "Suites" },
  { key: null, label: "Adapters" },
  { key: null, label: "Commits" },
  { key: null, label: "Verdict" },
]

export function RunsTable({ runs, sort, dir, onSort }: RunsTableProps) {
  return (
    <div
      className="overflow-x-auto rounded-lg border"
      role="region"
      aria-label="Runs table"
      tabIndex={0}
    >
      <Table>
        <TableCaption className="sr-only">
          Runs of Domain 1, sorted by {sort} {dir === "asc" ? "ascending" : "descending"}
        </TableCaption>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead
                key={column.label}
                className={column.className}
                aria-sort={
                  column.key === sort ? (dir === "asc" ? "ascending" : "descending") : undefined
                }
              >
                {column.key ? (
                  <button
                    type="button"
                    onClick={() => onSort(column.key as RunsSortKey)}
                    className="inline-flex items-center gap-1 rounded-sm font-medium hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {column.label}
                    {column.key === sort ? (
                      dir === "asc" ? (
                        <ArrowUp aria-hidden="true" className="size-3.5" />
                      ) : (
                        <ArrowDown aria-hidden="true" className="size-3.5" />
                      )
                    ) : (
                      <ArrowUpDown aria-hidden="true" className="size-3.5 opacity-40" />
                    )}
                  </button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <RunRow key={run.run_id} run={run} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RunRow({ run }: { run: RunEntry }) {
  const running = run.status === "running"
  // The run's own index, lazily: a 404 means the index lists a run the server no longer holds.
  const runIndex = useRunDocument(run.run_id, "index.json", "run-index", { enabled: !running })
  const pruned = runIndex.isError && runIndex.error.kind === "not-found"
  const files = runIndex.data?.ok ? runIndex.data.document.files : []
  const hasCi = files.some((file) => file.path === "ci.json")
  const start = parseRunId(run.run_id)?.startedAt
  const suites = [...run.suites].sort(compareSuites)
  const adapters = orderAdapters(run.adapters)
  const commits = commitsOf(run, ADAPTER_IDS)

  return (
    <TableRow data-run={run.run_id} data-pruned={pruned || undefined}>
      <TableCell className="align-top">
        <div className="flex flex-col gap-0.5">
          {running || pruned ? (
            <span className="font-mono text-xs">{run.run_id}</span>
          ) : (
            <Link
              to={`/d1/runs/${run.run_id}`}
              className="font-mono text-xs underline underline-offset-3"
            >
              {run.run_id}
            </Link>
          )}
          <time dateTime={isoUtc(run.started_at)} className="text-xs text-muted-foreground">
            {formatUtc(start ?? run.started_at)}
          </time>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge status={run.status} />
          {pruned ? (
            <Badge variant="outline" className="text-muted-foreground" data-state="pruned">
              pruned
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="align-top">
        {run.ci_profile ?? <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="align-top text-right">
        {running ? (
          <span className="text-muted-foreground">running</span>
        ) : (
          formatDuration(runDurationMs(run))
        )}
      </TableCell>
      <TableCell className="align-top">
        <span className="font-mono text-xs" title={suites.join(", ")}>
          {suites.join(" ")}
        </span>
      </TableCell>
      <TableCell className="align-top">
        <ul
          className="flex items-center gap-2"
          aria-label={`Adapters: ${adapters.map(adapterLabel).join(", ")}`}
        >
          {adapters.map((adapter) => (
            <li key={adapter}>
              <AdapterMark adapter={adapter} symbolOnly />
            </li>
          ))}
        </ul>
      </TableCell>
      <TableCell className="align-top">
        {commits.length === 0 ? (
          <span className="text-muted-foreground">not recorded</span>
        ) : (
          <dl className="grid grid-cols-[auto_auto] gap-x-2 gap-y-0 font-mono text-xs">
            {commits.map(({ role, commit }) => (
              <div key={role} className="contents">
                <dt className="text-muted-foreground">{role}</dt>
                <dd title={commit ?? undefined}>{commit ? shortDigest(commit) : "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </TableCell>
      <TableCell className="align-top">
        {running ? (
          <span className="text-muted-foreground">—</span>
        ) : pruned ? (
          <span className="text-muted-foreground">—</span>
        ) : runIndex.isPending ? (
          <span className="text-xs text-muted-foreground">…</span>
        ) : hasCi ? (
          <VerdictCell runId={run.run_id} />
        ) : (
          <span className="text-xs text-muted-foreground" title="Not a CI profile run: no ci.json">
            no report
          </span>
        )}
      </TableCell>
    </TableRow>
  )
}

function VerdictCell({ runId }: { runId: string }) {
  const ci = useRunDocument(runId, "ci.json", "ci-report")
  if (ci.isPending) return <span className="text-xs text-muted-foreground">…</span>
  if (ci.isError || !ci.data.ok)
    return <span className="text-xs text-muted-foreground">unreadable</span>
  return <StatusBadge status={ci.data.document.verdict} />
}
