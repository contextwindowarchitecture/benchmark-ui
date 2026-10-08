import { useLocation, useNavigate, useParams } from "react-router"

import { useRunsIndex } from "@/data/queries"
import { profilesOf, runsOfProfile } from "@/features/d1/model/runs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { formatUtc } from "@/lib/format"
import { runScopedPath, runsListParams } from "@/features/d1/model/url"
import { useUrlState } from "@/lib/url-state"

const ALL = "all"
const NONE = "none"

/**
 * Profile, then run id (ui-plan.md 6.1): a view of the URL. The run is the `:runId` segment; the
 * profile filter is the runs list's `?profile=` parameter, or the current run's profile.
 */
export function RunPicker() {
  const index = useRunsIndex()
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [urlState, setUrlState] = useUrlState(runsListParams)
  const currentRunId = typeof params["runId"] === "string" ? params["runId"] : undefined

  if (!index.data?.ok) {
    return (
      <div className="text-xs text-muted-foreground" aria-live="polite">
        {index.isPending
          ? "Loading runs…"
          : index.isError
            ? "Runs index unavailable"
            : "Runs index unreadable"}
      </div>
    )
  }
  const document = index.data.document
  const profiles = profilesOf(document)
  const currentRun = currentRunId
    ? document.runs.find((run) => run.run_id === currentRunId)
    : undefined
  const profile = urlState.profile ?? (currentRun ? (currentRun.ci_profile ?? NONE) : ALL)
  const runs =
    profile === ALL ? document.runs : runsOfProfile(document, profile === NONE ? null : profile)

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Run picker">
      <Select
        value={profile}
        onValueChange={(value) => setUrlState({ profile: value === ALL ? undefined : value })}
      >
        <SelectTrigger size="sm" aria-label="Profile" className="w-28">
          <SelectValue placeholder="Profile" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All profiles</SelectItem>
          {profiles.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
          <SelectItem value={NONE}>No profile</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={currentRunId && runs.some((run) => run.run_id === currentRunId) ? currentRunId : ""}
        onValueChange={(runId) => navigate(runScopedPath(location.pathname, currentRunId, runId))}
      >
        <SelectTrigger size="sm" aria-label="Run" className="w-64 font-mono text-xs">
          <SelectValue placeholder="Pick a run" />
        </SelectTrigger>
        <SelectContent>
          {runs.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No runs with this profile
            </div>
          ) : null}
          {runs.map((run) => (
            <SelectItem
              key={run.run_id}
              value={run.run_id}
              disabled={run.status === "running"}
              textValue={run.run_id}
            >
              <span className="flex items-center gap-2">
                <StatusBadge status={run.status} iconOnly />
                <span className="font-mono text-xs">{run.run_id}</span>
                <span className="text-xs text-muted-foreground">{formatUtc(run.started_at)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
