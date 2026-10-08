import { RefreshCw } from "lucide-react"

import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { DataRegion } from "@/components/dashboard/data-region"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import { profilesOf } from "@/features/d1/model/runs"
import { filterRuns, sortRuns } from "@/features/d1/model/runs-table"
import { RUN_STATUS_VALUES, runsListParams } from "@/features/d1/model/url"
import { useUrlState } from "@/lib/url-state"

import { RunsTable } from "./runs-table"

const ALL = "all"

/** Every run of Domain 1 from the runs index (ui-plan.md 8.2): sortable, filterable, shareable. */
export function RunsPage() {
  const index = useRunsIndex()
  const [state, setState] = useUrlState(runsListParams)
  const region = regionOfDocument(index, "d1/index.json", "the runs index")
  const sort = state.sort ?? "started"
  const dir = state.dir ?? (sort === "started" ? "desc" : "asc")
  const profiles = index.data?.ok ? profilesOf(index.data.document) : []

  return (
    <DashboardPage
      title="Runs"
      description="Every run of Domain 1 the results root holds, newest first. A run is immutable once it finishes; the index is what changes."
      width="wide"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => void index.refetch()}
          disabled={index.isFetching}
        >
          <RefreshCw
            aria-hidden="true"
            className={index.isFetching ? "motion-safe:animate-spin" : undefined}
          />
          Refresh
        </Button>
      }
      filters={
        <>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Profile</span>
            <Select
              value={state.profile ?? ALL}
              onValueChange={(value) => setState({ profile: value === ALL ? undefined : value })}
            >
              <SelectTrigger size="sm" className="w-36" aria-label="Filter by profile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All profiles</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile} value={profile}>
                    {profile}
                  </SelectItem>
                ))}
                <SelectItem value="none">No profile</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Select
              value={state.status ?? ALL}
              onValueChange={(value) =>
                setState({
                  status: value === ALL ? undefined : (value as (typeof RUN_STATUS_VALUES)[number]),
                })
              }
            >
              <SelectTrigger size="sm" className="w-32" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {RUN_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {state.profile || state.status ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setState({ profile: undefined, status: undefined })}
            >
              Clear filters
            </Button>
          ) : null}
        </>
      }
      status={
        index.isFetching && index.data ? (
          <p className="text-xs text-muted-foreground" role="status">
            Refreshing the index…
          </p>
        ) : null
      }
    >
      <DataRegion
        state={region}
        label="the runs index"
        skeleton={<Skeleton className="h-64 w-full" />}
      >
        {(document) => {
          if (document.runs.length === 0) {
            return (
              <p
                className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"
                data-state="empty"
              >
                No runs yet. The index is there but lists nothing; a run appears once the harness
                writes one.
              </p>
            )
          }
          const shown = sortRuns(
            filterRuns(document.runs, { profile: state.profile, status: state.status }),
            sort,
            dir,
          )
          return (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {shown.length === document.runs.length
                  ? `${document.runs.length} runs`
                  : `${shown.length} of ${document.runs.length} runs match`}
              </p>
              {shown.length === 0 ? (
                <p
                  className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"
                  data-state="no-results"
                >
                  No runs match these filters.
                </p>
              ) : (
                <RunsTable
                  runs={shown}
                  sort={sort}
                  dir={dir}
                  onSort={(key) =>
                    setState({
                      sort: key,
                      dir:
                        key === sort
                          ? dir === "asc"
                            ? "desc"
                            : "asc"
                          : key === "started"
                            ? "desc"
                            : "asc",
                    })
                  }
                />
              )}
            </div>
          )
        }}
      </DataRegion>
    </DashboardPage>
  )
}
