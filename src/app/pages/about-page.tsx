// About (ui-plan.md 8.11, 3.1): the viability document's framing, the links, and what this viewer
// is: its commit, the benchmark commit the lock pins, and the schema kinds it reads.

import { ExternalLink } from "lucide-react"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { TableRegion } from "@/components/dashboard/table-region"
import { SponsorLink, sponsorLabelClass } from "@/components/layout/sponsors"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ABOUT,
  CONTENT_SOURCE,
  DOMAINS,
  orderedSponsors,
  sourceUrl,
  SPONSORS_DISCLOSURE,
  TIER_WORDS,
  VIABILITY_DOCUMENT,
  type Sponsor,
} from "@/content"
import { buildInfo } from "@/lib/build-info"
import { ORGANISATION } from "@/lib/sites"
import { useSponsors } from "@/lib/sponsors-context"

const REPOSITORIES = [
  { name: "The specification", url: `${ORGANISATION}/contextwindowarchitecture` },
  {
    name: "The benchmark: harness, schemas, results and write-ups",
    url: `${ORGANISATION}/benchmark`,
  },
  { name: "This results site", url: `${ORGANISATION}/benchmark-ui` },
  { name: "The Python assembler", url: `${ORGANISATION}/assembler-python` },
  { name: "The TypeScript assembler", url: `${ORGANISATION}/assembler-typescript` },
  { name: "The Go assembler", url: `${ORGANISATION}/assembler-go` },
  { name: "The Rust assembler", url: `${ORGANISATION}/assembler-rust` },
]

function Out({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      rel="noreferrer"
      className="inline-flex items-center gap-1 underline underline-offset-3"
    >
      {children}
      <ExternalLink aria-hidden="true" className="size-3" />
    </a>
  )
}

export function AboutPage() {
  const sponsors = useSponsors()
  return (
    <DashboardPage
      variant="narrative"
      title="About"
      description="The document this benchmark comes from, where its pieces live, and what this viewer reads."
    >
      <PageSection id="framing" title="The viability document">
        <div className="max-w-prose space-y-3 text-sm leading-relaxed">
          {ABOUT.framing.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p>
            <Out href={sourceUrl(VIABILITY_DOCUMENT)}>Read the document</Out>{" "}
            <span className="text-muted-foreground">
              at the benchmark commit this site's words were reviewed against.
            </span>
          </p>
        </div>
      </PageSection>

      <PageSection id="write-ups" title="The write-ups">
        <ul className="space-y-2 text-sm">
          {DOMAINS.map((domain) => (
            <li key={domain.id} data-domain={domain.id}>
              <span className="font-medium">
                Domain {domain.number} · {domain.title}
              </span>
              {domain.writeUp ? (
                <>
                  {" · "}
                  <Out href={sourceUrl(domain.writeUp.file)}>{domain.writeUp.file}</Out>
                </>
              ) : (
                <span className="text-muted-foreground">
                  {" "}
                  · no write-up yet; the domain is not started
                </span>
              )}
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection id="repositories" title="The repositories">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {REPOSITORIES.map((repository) => (
            <li key={repository.url}>
              <Out href={repository.url}>{repository.name}</Out>
            </li>
          ))}
        </ul>
      </PageSection>

      {sponsors.length > 0 ? <SponsorsSection sponsors={sponsors} /> : null}

      <PageSection
        id="viewer"
        title="This viewer"
        description="A static site that reads the runs the harness wrote and validated. It computes no result and judges nothing."
      >
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
          <dt className="text-muted-foreground">Viewer commit</dt>
          <dd className="font-mono">{buildInfo.uiCommit}</dd>
          <dt className="text-muted-foreground">Benchmark commit</dt>
          <dd>
            <Out
              href={`https://github.com/${CONTENT_SOURCE.repository}/commit/${buildInfo.benchmarkCommit}`}
            >
              <span className="font-mono">{buildInfo.benchmarkCommit.slice(0, 7)}</span>
            </Out>{" "}
            <span className="text-muted-foreground">
              the commit the schemas, the fixtures and the content were taken from
            </span>
          </dd>
          <dt className="text-muted-foreground">Producers</dt>
          <dd className="font-mono">{buildInfo.producers.join(", ")}</dd>
        </dl>
        <TableRegion label="Schema kinds table">
          <Table>
            <TableCaption className="sr-only">
              The schema kinds this build reads, each at its major version.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Kind</TableHead>
                <TableHead scope="col">Schema</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildInfo.kinds.map((kind) => (
                <TableRow key={kind.kind}>
                  <TableCell className="font-mono text-xs">{kind.kind}</TableCell>
                  <TableCell className="font-mono text-xs">{kind.schema}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRegion>
        <p className="text-xs text-muted-foreground">
          A run written at a schema kind or major version not in this table renders as a state this
          viewer does not read, never as a guess.
        </p>
      </PageSection>
    </DashboardPage>
  )
}

/**
 * Each sponsor's logo, name and role, then the disclosure: they do not influence the harness, the
 * schemas or the results, all public at the benchmark commit this site is pinned to.
 */
function SponsorsSection({ sponsors }: { sponsors: readonly Sponsor[] }) {
  return (
    <PageSection id="sponsors" title="Sponsors and partners">
      <ul className="space-y-4 text-sm" data-sponsors="about">
        {orderedSponsors(sponsors).map((sponsor) => (
          <li
            key={sponsor.slug}
            data-sponsor={sponsor.slug}
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            <SponsorLink sponsor={sponsor} logoClassName="h-6 w-40" />
            <div className="min-w-0 flex-1 basis-64">
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-medium">{sponsor.name}</span>
                <span className={sponsorLabelClass}>{TIER_WORDS[sponsor.tier]}</span>
              </p>
              <p className="text-muted-foreground">{sponsor.role}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
        {SPONSORS_DISCLOSURE.join(" ")}{" "}
        <Out href={`https://github.com/${CONTENT_SOURCE.repository}/tree/${CONTENT_SOURCE.commit}`}>
          The repository at that commit
        </Out>
      </p>
    </PageSection>
  )
}
