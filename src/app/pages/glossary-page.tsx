// The glossary (ui-plan.md 8.11): the architecture's and the benchmark's terms, from the content
// files, each with an anchor other pages can link to (`/glossary#oracle`) and the file it was read
// against. A filter in the query string (`?q=`) narrows both groups at once.

import { Link } from "react-router"
import { z } from "zod"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  filterGlossary,
  GLOSSARY,
  glossaryEntry,
  sourceUrl,
  type GlossaryEntry,
  type GlossaryGroup,
} from "@/content"
import { formatCount } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

const glossaryParams = { q: z.string().max(200) }

const GROUPS: readonly { id: GlossaryGroup; title: string; description: string }[] = [
  {
    id: "architecture",
    title: "The architecture",
    description: "The words of the specification: what an assembler reads, decides and writes.",
  },
  {
    id: "benchmark",
    title: "The benchmark",
    description: "The words of testing it: how an answer is judged, and what the domains measure.",
  },
]

export function GlossaryPage() {
  const [state, setState] = useUrlState(glossaryParams)
  const query = state.q ?? ""
  const shown = filterGlossary(GLOSSARY, query)
  return (
    <DashboardPage
      title="Glossary"
      description="The terms of the Context Window Architecture and of the benchmark that tests it, each defined once with the document it was read against."
      filters={
        <>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Search</span>
            <Input
              type="search"
              value={query}
              onChange={(event) => setState({ q: event.target.value || undefined })}
              placeholder="term or word"
              className="h-8 w-56"
              aria-label="Search the glossary"
            />
          </label>
          {query ? (
            <Button variant="ghost" size="sm" onClick={() => setState({ q: undefined })}>
              Clear
            </Button>
          ) : null}
          <p className="ml-auto text-sm text-muted-foreground" aria-live="polite">
            {shown.length === GLOSSARY.length
              ? `${formatCount(GLOSSARY.length)} terms`
              : `${formatCount(shown.length)} of ${formatCount(GLOSSARY.length)} terms match`}
          </p>
        </>
      }
    >
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-state="no-results">
          No term matches “{query}”.{" "}
          <button
            type="button"
            className="underline underline-offset-3"
            onClick={() => setState({ q: undefined })}
          >
            Show every term
          </button>
        </p>
      ) : (
        GROUPS.map((group) => {
          const entries = shown.filter((entry) => entry.group === group.id)
          if (entries.length === 0) return null
          return (
            <PageSection
              key={group.id}
              id={group.id}
              title={group.title}
              description={group.description}
            >
              <dl className="divide-y divide-border border-y border-border">
                {entries.map((entry) => (
                  <Term key={entry.id} entry={entry} />
                ))}
              </dl>
            </PageSection>
          )
        })
      )}
    </DashboardPage>
  )
}

function Term({ entry }: { entry: GlossaryEntry }) {
  const related = (entry.see ?? []).flatMap((id) => {
    const target = glossaryEntry(id)
    return target ? [target] : []
  })
  return (
    <div className="grid gap-1 py-3 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-6">
      <dt
        id={entry.id}
        tabIndex={-1}
        className="scroll-mt-20 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="font-medium">{entry.term}</span>
        {entry.also?.length ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            also {entry.also.join(", ")}
          </span>
        ) : null}
      </dt>
      <dd className="max-w-prose space-y-1.5 text-sm leading-relaxed">
        <p>{entry.text}</p>
        {related.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            See{" "}
            {related.map((target, index) => (
              <span key={target.id}>
                {index > 0 ? ", " : null}
                <Link
                  to={`/glossary#${target.id}`}
                  className="text-foreground underline underline-offset-3"
                >
                  {target.term}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          From{" "}
          <a
            href={sourceUrl(entry.citation.file)}
            rel="noreferrer"
            className="underline underline-offset-3"
          >
            {entry.citation.file.split("/").at(-1)}
          </a>
          {entry.citation.section ? `, ${entry.citation.section}` : ""}
        </p>
      </dd>
    </div>
  )
}
