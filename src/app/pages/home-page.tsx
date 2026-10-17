// The home page (ui-plan.md 8.11; DESIGN.md 4.5): what CWA is, what the benchmark tests, and how
// to read the results. Words from the content files, every number from the runs indexes, Domain
// 1's composite's two summaries and Domain 2's latest run's. The model diagram draws the latest
// run's contract, or, when the volume no longer holds that run, the newest run's that it does.

import { ArrowRight } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion } from "@/components/dashboard/data-region"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { SupportedBy } from "@/components/layout/sponsors"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DOMAINS,
  HOW_TO_READ,
  headlineSponsors,
  sourceUrl,
  WHAT_CWA_IS,
  type DomainContent,
} from "@/content"
import {
  ResultsDomainContext,
  useDomainRunsIndex,
  useRunDocument,
  useRunsIndex,
} from "@/data/queries"
import { kindIn } from "@/data/kinds"
import { regionOfDocument } from "@/data/region"
import type { RunsIndexV1 } from "@/data/schema/generated"
import { ModelDiagram } from "@/features/d1/components/diagrams/model-diagram"
import { resolveComposite, type Composite } from "@/features/d1/model/composite"
import { suitesPassing } from "@/features/d1/model/overview"
import { newestPresentRun, resolveAlias } from "@/features/d1/model/runs"
import { DOMAIN_PAGES } from "@/lib/domains"
import { formatCount, formatUtc, isoUtc } from "@/lib/format"
import { useSponsors } from "@/lib/sponsors-context"

export function HomePage() {
  const index = useRunsIndex()
  // The headline sponsors, right of the title at wide widths and under the lede on a phone;
  // nothing, not even the slot, without one.
  const headline = headlineSponsors(useSponsors())
  const region = regionOfDocument(index, "d1/index.json", "the runs index")
  const document = index.data?.ok ? index.data.document : undefined
  const latest = document ? resolveAlias(document, "latest") : undefined
  // The runs whose contract was found gone: the set only grows, so the diagram settles on the
  // newest run the volume holds. Another failure is shown as it is, not read past.
  const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set())
  const drawn = document ? newestPresentRun(document, gone) : undefined
  const contract = useRunDocument(drawn?.run_id, "contract.json", "contract")
  if (drawn && contract.isError && contract.error.kind === "not-found" && !gone.has(drawn.run_id)) {
    setGone(new Set([...gone, drawn.run_id]))
  }
  return (
    <DashboardPage
      variant="narrative"
      kicker="Viability results"
      title="CWA benchmark"
      description="The viability benchmark of the Context Window Architecture: what each domain establishes, with every number behind it."
      actions={
        headline.length > 0 ? (
          <SupportedBy placement="hero" sponsors={headline} logoClassName="h-6" />
        ) : undefined
      }
    >
      <PageSection id="what" title="What CWA is">
        <div className="max-w-prose space-y-3 text-base leading-relaxed">
          {WHAT_CWA_IS.map((sentence) => (
            <p key={sentence}>{sentence}</p>
          ))}
        </div>
        {drawn ? (
          <>
            {latest && latest.run_id !== drawn.run_id ? (
              <p className="text-sm text-muted-foreground" data-state="read-past">
                The latest run, <span className="font-mono">{latest.run_id}</span>, is not on the
                server; the diagram draws from the contract of{" "}
                <span className="font-mono">{drawn.run_id}</span>.
              </p>
            ) : null}
            <DataRegion
              state={regionOfDocument(contract, `${drawn.run_id}/contract.json`, "the contract")}
              label="the contract"
              skeleton={<Skeleton className="h-72 w-full" />}
            >
              {(doc) => <ModelDiagram contract={doc} runId={drawn.run_id} />}
            </DataRegion>
          </>
        ) : index.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <p className="text-sm text-muted-foreground" data-state="empty">
            {gone.size > 0
              ? "The model diagram draws from a run's contract; none of the runs the index lists is on the server."
              : "The model diagram draws from a run's contract; there is no finished run yet."}
          </p>
        )}
      </PageSection>

      <PageSection
        id="domains"
        title="What the benchmark tests"
        description="Five domains, each designed to establish one thing about CWA. The first two have results so far."
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
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
      {DOMAINS.map((domain) => (
        <li
          key={domain.id}
          className={
            domain.id === "d1" || domain.id === "d2" || domain.id === "d5"
              ? "md:col-span-2"
              : undefined
          }
        >
          <DomainCard
            domain={domain}
            headline={
              domain.id === "d1" ? (
                <Domain1Headline composite={composite} />
              ) : domain.id === "d2" || domain.id === "d5" ? (
                // The home page is no domain's: this card reads that domain's results.
                <ResultsDomainContext.Provider value={domain.id}>
                  <LatestRunHeadline domain={domain.id} />
                </ResultsDomainContext.Provider>
              ) : null
            }
          />
        </li>
      ))}
    </ul>
  )
}

function DomainCard({ domain, headline }: { domain: DomainContent; headline: ReactNode }) {
  return (
    <Card className="h-full" data-domain={domain.id}>
      <CardHeader>
        <CardTitle
          data-heading
          className="flex flex-wrap items-center gap-2 text-[17px] font-semibold tracking-[-0.015em]"
        >
          <Link to={`/${domain.id}`} className="underline-offset-3 hover:underline">
            Domain {domain.number} · {domain.title}
          </Link>
          {headline ? null : <Badge variant="outline">not started</Badge>}
        </CardTitle>
        <CardDescription>{domain.claim}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {headline}
        <p>
          <Link
            to={`/${domain.id}`}
            className="inline-flex items-center gap-1 underline underline-offset-3"
          >
            {headline ? "The overview" : "The domain's design"}{" "}
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

/** A domain's latest run from its own index: its status and how many suites pass. */
function LatestRunHeadline({ domain }: { domain: "d2" | "d5" }) {
  const { base, label } = DOMAIN_PAGES[domain]
  const index = useDomainRunsIndex(domain)
  const latest = index.data?.ok ? resolveAlias(index.data.document, "latest") : undefined
  const summary = useRunDocument(latest?.run_id, "summary.json", kindIn(domain, "summary"))
  if (index.isPending)
    return <Skeleton className="h-5 w-72 max-w-full" aria-label={`Loading ${label}'s runs`} />
  if (!index.data?.ok) {
    return (
      <p className="text-muted-foreground" data-state="unreadable">
        {label}'s runs index could not be read.
      </p>
    )
  }
  if (!latest) {
    return (
      <p className="text-muted-foreground" data-state="empty">
        No finished run yet.{" "}
        <Link to={`${base}/runs`} className="underline underline-offset-3">
          The runs list
        </Link>{" "}
        shows what exists.
      </p>
    )
  }
  const passing = summary.data?.ok
    ? {
        passed: summary.data.document.suites.filter((suite) => suite.status === "pass").length,
        total: summary.data.document.suites.length,
      }
    : null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" data-run={latest.run_id}>
      <span className="text-muted-foreground">Latest</span>
      <Link to={`${base}/runs/${latest.run_id}`} className="font-mono underline underline-offset-3">
        {latest.run_id}
      </Link>
      <StatusBadge status={latest.status} />
      <time dateTime={isoUtc(latest.started_at)} className="text-muted-foreground">
        {formatUtc(latest.started_at)}
      </time>
      {passing ? (
        <span className="tabular">
          {formatCount(passing.passed)} of {formatCount(passing.total)} suites pass
        </span>
      ) : summary.isPending ? (
        <Skeleton className="h-4 w-28" aria-label="Loading the suites" />
      ) : null}
    </div>
  )
}
