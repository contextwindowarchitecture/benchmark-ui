import { ArrowRight } from "lucide-react"
import { Link } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion } from "@/components/dashboard/data-region"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import { profilesOf, resolveAlias } from "@/features/d1/model/runs"
import { formatUtc, isoUtc } from "@/lib/format"

const OTHER_DOMAINS = [
  { id: "d2", title: "Domain 2 · Long-horizon multi-turn stability" },
  { id: "d3", title: "Domain 3 · Agentic context engineering" },
  { id: "d4", title: "Domain 4 · Computational economics and prefix caching" },
  { id: "d5", title: "Domain 5 · Instruction hierarchy and security" },
]

/**
 * The home page of phase UI-P0: Domain 1 with its latest run, and the other domains as not
 * started. The narrative (what CWA is, the claims, the diagrams) is phase UI-P5.
 */
export function HomePage() {
  const index = useRunsIndex()
  const region = regionOfDocument(index, "d1/index.json", "the runs index")
  return (
    <DashboardPage
      title="CWA benchmark"
      description="The viability benchmark of the Context Window Architecture: what each domain establishes, with every number behind it."
    >
      <PageSection title="Domain 1 · Assembly determinism, budgeting and traceability" id="d1">
        <Card>
          <CardHeader>
            <CardTitle>Latest run</CardTitle>
            <CardDescription>Resolved from the runs index, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataRegion
              state={region}
              label="the runs index"
              skeleton={<Skeleton className="h-16 w-full max-w-md" />}
            >
              {(document) => {
                const latest = resolveAlias(document, "latest")
                if (!latest) {
                  return (
                    <p className="text-sm text-muted-foreground" data-state="empty">
                      No run yet. The index lists {document.runs.length} runs, none finished.
                    </p>
                  )
                }
                return (
                  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                    <dt className="text-muted-foreground">Run</dt>
                    <dd>
                      <Link
                        to={`/d1/runs/${latest.run_id}`}
                        className="font-mono underline underline-offset-3"
                      >
                        {latest.run_id}
                      </Link>
                    </dd>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <StatusBadge status={latest.status} />
                    </dd>
                    <dt className="text-muted-foreground">Started</dt>
                    <dd>
                      <time dateTime={isoUtc(latest.started_at)}>
                        {formatUtc(latest.started_at)}
                      </time>
                    </dd>
                    <dt className="text-muted-foreground">Profiles</dt>
                    <dd>
                      {profilesOf(document).length === 0
                        ? "none"
                        : profilesOf(document).map((profile) => {
                            const run = resolveAlias(document, profile)
                            return (
                              <span key={profile} className="mr-3">
                                {profile}:{" "}
                                {run ? (
                                  <Link
                                    to={`/d1/runs/${run.run_id}`}
                                    className="font-mono underline underline-offset-3"
                                  >
                                    {run.run_id}
                                  </Link>
                                ) : (
                                  "no finished run"
                                )}
                              </span>
                            )
                          })}
                    </dd>
                  </dl>
                )
              }}
            </DataRegion>
            <p className="mt-4 text-sm">
              <Link
                to="/d1/runs"
                className="inline-flex items-center gap-1 underline underline-offset-3"
              >
                All runs <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </p>
          </CardContent>
        </Card>
      </PageSection>
      <PageSection title="Other domains" id="others">
        <ul className="grid gap-3 sm:grid-cols-2">
          {OTHER_DOMAINS.map((domain) => (
            <li key={domain.id}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">{domain.title}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline">not started</Badge>
                  </CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </PageSection>
    </DashboardPage>
  )
}
