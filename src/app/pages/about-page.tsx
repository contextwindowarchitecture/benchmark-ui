// About (ui-plan.md 8.11, 3.1): the viability document's framing, the links, and what this viewer
// is: its commit, the benchmark commit the lock pins, and the schema kinds it reads.

import { ExternalLink } from "lucide-react"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { TableRegion } from "@/components/dashboard/table-region"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ABOUT, CONTENT_SOURCE, DOMAINS, sourceUrl, VIABILITY_DOCUMENT } from "@/content"
import { buildInfo } from "@/lib/build-info"

const ORGANISATION = "https://github.com/contextwindowarchitecture"

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
  return (
    <DashboardPage
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
          <dt className="text-muted-foreground">Producer</dt>
          <dd className="font-mono">{buildInfo.producer}</dd>
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
                  <TableCell className="font-mono text-xs">
                    {buildInfo.producer}/{kind.kind}/v{kind.version}
                  </TableCell>
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
