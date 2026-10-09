// A domain the benchmark has not started (ui-plan.md 8.11): its claim and a summary of its design
// from the viability document, and nothing that looks like a result.

import { Link } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { Badge } from "@/components/ui/badge"
import { domainById, sourceUrl } from "@/content"

import { NotFoundPage } from "./not-found-page"

export function DomainPage({ id }: { id: string }) {
  const domain = domainById(id)
  if (!domain || domain.id === "d1") return <NotFoundPage />
  return (
    <DashboardPage
      title={`Domain ${domain.number} · ${domain.title}`}
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          <Badge variant="outline">not started</Badge>
          <span>This domain has no runs yet. This page carries its design, not results.</span>
        </span>
      }
    >
      <PageSection id="claim" title="Designed to establish">
        <p className="max-w-prose text-lg leading-snug font-medium">{domain.claim}</p>
      </PageSection>
      <PageSection id="design" title="How the viability document designs it">
        <div className="max-w-prose space-y-3 text-sm leading-relaxed">
          {domain.design.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="text-xs text-muted-foreground">
            Summarized from{" "}
            <a
              href={sourceUrl(domain.citation.file)}
              rel="noreferrer"
              className="underline underline-offset-3"
            >
              {domain.citation.file}
            </a>
            {domain.citation.section ? `, ${domain.citation.section}` : ""}.
          </p>
        </div>
      </PageSection>
      <p className="text-sm text-muted-foreground">
        Meanwhile,{" "}
        <Link to="/d1" className="underline underline-offset-3">
          Domain 1 has results
        </Link>
        .
      </p>
    </DashboardPage>
  )
}
