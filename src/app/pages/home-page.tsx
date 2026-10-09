// The home page (ui-plan.md 8.11; DESIGN.md 4.5): what CWA is, what the benchmark tests, and how
// to read the results. Words from the content files, every number from the runs index and the
// composite's two summaries.

import { ArrowRight } from "lucide-react"
import { Link } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion } from "@/components/dashboard/data-region"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DOMAINS, HOW_TO_READ, sourceUrl, WHAT_CWA_IS, type DomainContent } from "@/content"
import { useRunDocument, useRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { RunsIndexV1 } from "@/data/schema/generated"
import { ModelDiagram } from "@/features/d1/components/diagrams/model-diagram"
import { resolveComposite, type Composite } from "@/features/d1/model/composite"
import { suitesPassing } from "@/features/d1/model/overview"
import { resolveAlias } from "@/features/d1/model/runs"
import { formatCount, formatUtc, isoUtc } from "@/lib/format"

export function HomePage() {
  const index = useRunsIndex()
  const region = regionOfDocument(index, "d1/index.json", "the runs index")
  const document = index.data?.ok ? index.data.document : undefined
  const latest = document ? resolveAlias(document, "latest") : undefined
  const contract = useRunDocument(latest?.run_id, "contract.json", "contract")
  return (
    <DashboardPage
      title="CWA benchmark"
      description="The viability benchmark of the Context Window Architecture: what each domain establishes, with every number behind it."
    >
      <PageSection id="what" title="What CWA is">
        <div className="max-w-prose space-y-3 text-base leading-relaxed">
          {WHAT_CWA_IS.map((sentence) => (
            <p key={sentence}>{sentence}</p>
          ))}
        </div>
        {latest ? (
          <DataRegion
            state={regionOfDocument(contract, `${latest.run_id}/contract.json`, "the contract")}
            label="the contract"
            skeleton={<Skeleton className="h-72 w-full" />}
          >
            {(doc) => <ModelDiagram contract={doc} runId={latest.run_id} />}
          </DataRegion>
        ) : index.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <p className="text-sm text-muted-foreground" data-state="empty">
            The model diagram draws from a run's contract; there is no finished run yet.
          </p>
        )}
      </PageSection>

      <PageSection
        id="domains"
        title="What the benchmark tests"
        description="Five domains, each designed to establish one thing about CWA. Only the first has results so far."
      >
        <DataRegion
          state={region}
          label="the runs index"
          skeleton={<Skeleton className="h-64 w-full" />}
        >
          {(doc) => <DomainCards index={doc} />}
        </DataRegion>
      </PageSection>

      <PageSection id="reading" title="How to read the results">
        <div className="max-w-prose space-y-3 text-sm">
          <p>{HOW_TO_READ.oracles}</p>
          <p className="text-muted-foreground">{HOW_TO_READ.numbers}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {DOMAINS.filter((domain) => domain.writeUp).map((domain) => (
              <li key={domain.id}>
                <a
                  href={sourceUrl(domain.writeUp!.file)}
                  rel="noreferrer"
                  className="underline underline-offset-3"
                >
                  The Domain {domain.number} write-up
                </a>
              </li>
            ))}
            <li>
              <Link to="/about" className="underline underline-offset-3">
                About the benchmark and this viewer
              </Link>
            </li>
            <li>
              <Link to="/glossary" className="underline underline-offset-3">
                The glossary of terms
              </Link>
            </li>
          </ul>
        </div>
      </PageSection>
    </DashboardPage>
  )
}

function DomainCards({ index }: { index: RunsIndexV1 }) {
  const composite = resolveComposite(index, {})
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {DOMAINS.map((domain) => (
        <li key={domain.id} className={domain.id === "d1" ? "md:col-span-2" : undefined}>
          <DomainCard domain={domain} composite={domain.id === "d1" ? composite : undefined} />
        </li>
      ))}
    </ul>
  )
}

function DomainCard({
  domain,
  composite,
}: {
  domain: DomainContent
  composite: Composite | undefined
}) {
  return (
    <Card className="h-full" data-domain={domain.id}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Link to={`/${domain.id}`} className="underline-offset-3 hover:underline">
            Domain {domain.number} · {domain.title}
          </Link>
          {composite ? null : <Badge variant="outline">not started</Badge>}
        </CardTitle>
        <CardDescription>{domain.claim}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {composite ? <Domain1Headline composite={composite} /> : null}
        <p>
          <Link
            to={`/${domain.id}`}
            className="inline-flex items-center gap-1 underline underline-offset-3"
          >
            {composite ? "The overview" : "The domain's design"}{" "}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

/** Domain 1's composite headline: the two runs, their status, and how many suites pass. */
function Domain1Headline({ composite }: { composite: Composite }) {
  const nightly = composite.nightly?.run
  const s7 = composite.s7?.run
  const nightlySummary = useRunDocument(nightly?.run_id, "summary.json", "summary")
  const s7Summary = useRunDocument(s7?.run_id, "summary.json", "summary")
  if (!nightly && !s7) {
    return (
      <p className="text-muted-foreground" data-state="empty">
        No finished run yet.{" "}
        <Link to="/d1/runs" className="underline underline-offset-3">
          The runs list
        </Link>{" "}
        shows what exists.
      </p>
    )
  }
  const line = (label: string, run: typeof nightly, query: typeof nightlySummary) =>
    run ? (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1" data-run={run.run_id}>
        <span className="text-muted-foreground">{label}</span>
        <Link to={`/d1/runs/${run.run_id}`} className="font-mono underline underline-offset-3">
          {run.run_id}
        </Link>
        <StatusBadge status={run.status} />
        <time dateTime={isoUtc(run.started_at)} className="text-muted-foreground">
          {formatUtc(run.started_at)}
        </time>
        {query.data?.ok ? (
          <span className="tabular">
            {formatCount(suitesPassing(query.data.document).passed)} of{" "}
            {formatCount(suitesPassing(query.data.document).total)} suites pass
          </span>
        ) : query.isPending ? (
          <Skeleton className="h-4 w-28" aria-label="Loading the suites" />
        ) : null}
      </div>
    ) : (
      <div className="text-muted-foreground">{label}: no run in the index has it</div>
    )
  return (
    <div className="space-y-1">
      {line("Nightly", nightly, nightlySummary)}
      {line("S7", s7, s7Summary)}
    </div>
  )
}
