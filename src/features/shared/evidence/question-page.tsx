// A question page (UI-D2c; UI-D5; DESIGN.md 4.5's order): the viability document's metric and
// what it expected, the evidence from the runs the composite reads, what the write-up concludes,
// and the drill-down. Each page brings its words (src/content/<domain>/questions.ts) and its
// evidence; this frame reads the domain's runs index, the pinned run and the composite's notices
// for every one. A domain binds its own evidence hook and legend (its question-page.tsx).

import { ExternalLink } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion } from "@/components/dashboard/data-region"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { sourceUrl } from "@/content"
import type { QuestionWords } from "@/content/questions"
import { useDomainRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { RunsIndexV1 } from "@/features/d1/model/runs"
import type { Composite } from "@/features/shared/model/composite"
import { useDomainPages } from "@/lib/domains"

import {
  NoRunsNotice,
  PassedOverNotice,
  RunPin,
  UnknownPinNotice,
  UnreadableNotice,
} from "./evidence-states"
import type { EvidenceDomain } from "./use-evidence"

/** What a domain's evidence hook gives the frame: the composite's view and the failed summaries. */
type FrameEvidence = { view: Composite; failed: string[] }

export type QuestionPageProps<E extends FrameEvidence> = {
  domain: EvidenceDomain
  words: QuestionWords
  /** The run `?run=` pins, if any. */
  pin: string | undefined
  onPin: (run: string | undefined) => void
  /** The suites whose own summaries the evidence reads (their typed blocks). */
  blockSuites: readonly string[]
  /** The domain's evidence hook, called with its runs index, the pin and the block suites. */
  useEvidence: (index: RunsIndexV1, pin: string | undefined, blockSuites: readonly string[]) => E
  /** The arm legend the domain's panels share. */
  legend: ReactNode
  /** The page's sections of evidence. */
  children: (evidence: E) => ReactNode
  /** The suite-page sections the drill-down links, as [suite, anchor, words]. */
  drillDown: readonly (readonly [suite: string, anchor: string, words: string])[]
}

export function QuestionPage<E extends FrameEvidence>({
  domain,
  pin,
  onPin,
  ...props
}: QuestionPageProps<E>) {
  const runsIndex = useDomainRunsIndex(domain)
  const region = regionOfDocument(runsIndex, `${domain}/index.json`, "the runs index")
  const { words } = props
  return (
    <DashboardPage
      variant="narrative"
      title={words.title}
      description={words.question}
      width="wide"
      filters={
        runsIndex.data?.ok ? (
          <RunPin index={runsIndex.data.document} pinned={pin} onChange={onPin} />
        ) : null
      }
    >
      <DataRegion
        state={region}
        label="the runs index"
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        {(index) => <QuestionBody index={index} pin={pin} {...props} />}
      </DataRegion>
    </DashboardPage>
  )
}

function QuestionBody<E extends FrameEvidence>({
  index,
  pin,
  words,
  blockSuites,
  useEvidence,
  legend,
  children,
  drillDown,
}: Omit<QuestionPageProps<E>, "domain" | "onPin"> & { index: RunsIndexV1 }) {
  const evidence = useEvidence(index, pin, blockSuites)
  const { view } = evidence
  const { base, label } = useDomainPages()
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10">
      <UnknownPinNotice view={view} />
      <ViabilitySection words={words} />
      <PageSection
        id="evidence"
        title="The evidence"
        description="The suites' typed blocks, as the harness tallied them. Each panel names its run."
      >
        {view.suites.length === 0 ? (
          <NoRunsNotice />
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
            <PassedOverNotice view={view} />
            <UnreadableNotice failed={evidence.failed} />
            {legend}
            {children(evidence)}
          </div>
        )}
      </PageSection>
      <PageSection
        id="write-up"
        title="What the write-up concludes"
        description="For the run it reports. The panels above are the records of the runs this page reads, which may not be that run."
      >
        <div className="max-w-prose space-y-2 text-sm">
          {words.writeUp.text.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
        <Cited file={words.writeUp.citation.file} section={words.writeUp.citation.section} />
      </PageSection>
      <PageSection
        id="drill-down"
        title="The drill-down"
        description="Every number behind this page."
      >
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm" data-links>
          {drillDown.flatMap(([suite, anchor, text]) => {
            const entry = view.suites.find((source) => source.suite === suite)
            return entry
              ? [
                  <li key={`${suite}-${anchor}`}>
                    <Link
                      to={`${base}/runs/${entry.run.run_id}/suites/${suite}#${anchor}`}
                      className="underline underline-offset-3"
                    >
                      {text}
                    </Link>
                  </li>,
                ]
              : []
          })}
          <li>
            <Link to={base} className="underline underline-offset-3">
              {label}'s overview
            </Link>
          </li>
          <li>
            <Link to="/glossary" className="underline underline-offset-3">
              The glossary
            </Link>
          </li>
        </ul>
      </PageSection>
    </div>
  )
}

function Cited({ file, section }: { file: string; section?: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      Words from{" "}
      <a href={sourceUrl(file)} rel="noreferrer" className="underline underline-offset-3">
        {file}
      </a>
      {section ? `, ${section}` : ""}.
    </p>
  )
}

/** The viability document's metric: what it expected, the paper, and how the domain measures it. */
function ViabilitySection({ words }: { words: QuestionWords }) {
  const { viability, paper } = words
  const { label } = useDomainPages()
  return (
    <PageSection
      id="viability"
      title="What the viability document expects"
      description={`${viability.where}: “${viability.metric}”, and how this domain measures it.`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <dl className="grid gap-4 md:grid-cols-2" data-viability>
          <div className="border p-4">
            <dt className="text-sm font-medium">With conventional assembly</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{viability.baseline}</dd>
          </div>
          <div className="border p-4">
            <dt className="text-sm font-medium">Expected with CWA</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{viability.expected}</dd>
          </div>
        </dl>
        <Cited file={viability.citation.file} section={viability.citation.section} />
        {[...(paper ? [paper] : []), ...(words.morePapers ?? [])].map((entry) => (
          <div key={entry.url} className="max-w-prose space-y-1 text-sm" data-paper>
            <p>
              <a
                href={entry.url}
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium underline underline-offset-3"
              >
                {entry.title}
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>{" "}
              <span className="text-muted-foreground">({entry.authors})</span>
            </p>
            <p className="text-muted-foreground">{entry.text}</p>
          </div>
        ))}
        <section aria-labelledby="measured-heading" className="max-w-prose space-y-2">
          <h3 id="measured-heading" className="text-sm font-medium">
            How {label} measures it
          </h3>
          {words.measured.map((text) => (
            <p key={text} className="text-sm">
              {text}
            </p>
          ))}
        </section>
      </div>
    </PageSection>
  )
}

/** A picker over the tiers a panel is read at, each named by `format`. */
export function TierPicker({
  tiers,
  value,
  onChange,
  format,
  label = "Budget the panels are read at",
}: {
  tiers: readonly string[]
  value: string
  onChange: (tier: string) => void
  format: (tier: string) => string
  label?: string
}) {
  if (tiers.length < 2) {
    return <span className="text-sm text-muted-foreground">At {format(value)}</span>
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">At</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger size="sm" className="w-44" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {tiers.map((tier) => (
            <SelectItem key={tier} value={tier}>
              {format(tier)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

/** A picker over named options (a family, a question kind). */
export function OptionPicker({
  options,
  value,
  onChange,
  label,
  prefix,
}: {
  options: readonly { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  label: string
  prefix: string
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{prefix}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger size="sm" className="w-56 max-w-full min-w-0" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
