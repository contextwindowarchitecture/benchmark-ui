// The Domain 2 overview (the UI-D2 plan; ui-plan.md 7.1; DESIGN.md 4.5): the claim, the evidence,
// how far to trust it, the drill-down, over the composite of the runs each suite is read from.
// Every panel names its run and the scripts' size; words come from the content files, numbers
// from the records. A run the index lists but the volume no longer holds is found gone when its
// summary is asked for; the composite then reads past it, and the page says which run stands in.

import type { ReactNode } from "react"
import { Link } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion } from "@/components/dashboard/data-region"
import { Skeleton } from "@/components/ui/skeleton"
import { domainById, sourceUrl } from "@/content"
import { QUESTIONS } from "@/content/d2/questions"
import { CONCLUSION, CONCLUSIONS, CONCLUSIONS_CITATION, QUESTION } from "@/content/d2/trust"
import { useDomainRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { D2RunsIndexV1 } from "@/data/schema/generated"
import type { ArmBlocks } from "@/features/d2/model/blocks"
import { headlineBudget } from "@/features/d2/model/metrics"
import { checks, type CheckSource } from "@/features/d2/model/overview"
import { d2OverviewParams } from "@/features/d2/model/url"
import { SourcesTable } from "@/features/shared/evidence/sources-table"
import { useUrlState } from "@/lib/url-state"

import { ArmLegend } from "../arm-label"
import {
  BlocksPanel,
  NoRunsNotice,
  PassedOverNotice,
  RunPin,
  SuitePanel,
  UnknownPinNotice,
  UnreadableNotice,
} from "../evidence/evidence-states"
import { useEvidence, type SuiteEvidence } from "../evidence/use-evidence"
import {
  AptitudePanel,
  AttributionPanel,
  CostPanel,
  LongContextPairedPanel,
  LongContextPanel,
  LoopPanel,
  PairedPanel,
  UnreliabilityPanel,
} from "./evidence-panels"
import { ChecksGrid, TrustNotes } from "./trust-section"

const domain = domainById("d2")

export function D2OverviewPage() {
  const runsIndex = useDomainRunsIndex("d2")
  const [params, setParams] = useUrlState(d2OverviewParams)
  const region = regionOfDocument(runsIndex, "d2/index.json", "the runs index")
  return (
    <DashboardPage
      variant="narrative"
      kicker="Overview"
      title={`Domain 2 · ${domain?.title ?? "Long-horizon multi-turn stability"}`}
      description={domain?.claim}
      width="wide"
      filters={
        runsIndex.data?.ok ? (
          <RunPin
            index={runsIndex.data.document}
            pinned={params.run}
            onChange={(run) => setParams({ run })}
          />
        ) : null
      }
    >
      <DataRegion
        state={region}
        label="the runs index"
        skeleton={<Skeleton className="h-96 w-full" />}
      >
        {(index) => <Overview index={index} pin={params.run} />}
      </DataRegion>
    </DashboardPage>
  )
}

function Overview({ index, pin }: { index: D2RunsIndexV1; pin: string | undefined }) {
  // The suite summaries whose typed by_arm blocks the panels read (harness ask 13): S2's paired
  // differences and attribution, S4's pairing over documents, S6's pairing in the loop.
  const evidence = useEvidence(index, pin, ["S2", "S4", "S6"])
  const { view, sizes, pending, failed } = evidence
  const blocksOf = evidence.blocksOf
  const blockPanel = (suite: string, render: (blocks: ArmBlocks) => ReactNode) => (
    <BlocksPanel evidence={evidence} suite={suite}>
      {(blocks) => render(blocks)}
    </BlocksPanel>
  )
  const metricsOf = evidence.metricsOf
  const s0 = metricsOf("S0")
  const s1 = metricsOf("S1")
  const s2 = metricsOf("S2")
  const s4 = metricsOf("S4")
  const s5 = metricsOf("S5")
  const s6 = metricsOf("S6")
  const s7 = metricsOf("S7")
  const budget = s2 ? headlineBudget(s2.metrics) : null
  const checkSources: CheckSource[] = [s0, s1, s5, s7].flatMap((entry) =>
    entry ? [{ suite: entry.source.suite, runId: entry.source.runId, metrics: entry.metrics }] : [],
  )

  const panel = (suite: string, render: (entry: SuiteEvidence) => ReactNode) => (
    <SuitePanel evidence={evidence} suite={suite}>
      {render}
    </SuitePanel>
  )

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10">
      <UnknownPinNotice view={view} />

      <PageSection
        id="claim"
        title="The claim"
        description="What Domain 2 is designed to establish about CWA, and the question it asks."
      >
        <p className="max-w-prose text-lg leading-snug font-medium">{domain?.claim}</p>
        <div className="max-w-prose space-y-2 text-sm">
          <p>{QUESTION.question}</p>
          <p className="text-muted-foreground">{QUESTION.heldEqual}</p>
        </div>
        {view.suites.length === 0 ? <NoRunsNotice /> : <SourcesTable view={view} sizes={sizes} />}
        <PassedOverNotice view={view} />
        <UnreadableNotice failed={failed} />
      </PageSection>

      <PageSection
        id="answer"
        title="The answer, in words"
        description="What the write-up concludes for the run it reports. The panels below are the records of the runs this page reads, which may not be that run."
      >
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2" data-conclusions>
          {CONCLUSIONS.map((note) => (
            <li key={note.id} className="border p-4 text-sm">
              <h3 className="font-medium">{note.title}</h3>
              <p className="mt-1 text-muted-foreground">{note.text}</p>
            </li>
          ))}
        </ul>
        <p className="max-w-prose text-sm">{CONCLUSION}</p>
        <p className="text-xs text-muted-foreground">
          Words from{" "}
          <a
            href={sourceUrl(CONCLUSIONS_CITATION.file)}
            rel="noreferrer"
            className="underline underline-offset-3"
          >
            {CONCLUSIONS_CITATION.file}
          </a>
          .
        </p>
      </PageSection>

      <PageSection
        id="evidence"
        title="The evidence"
        description="Each suite's typed metrics, as the harness measured them. Each panel names its run."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
          <ArmLegend />
          <section aria-labelledby="aptitude-heading" className="space-y-3">
            <h3 id="aptitude-heading" className="text-sm font-medium">
              Does the model keep doing the task? Scripted conversations (S2)
            </h3>
            {panel("S2", (entry) =>
              budget ? (
                <AptitudePanel
                  s2={entry.metrics}
                  s1={s1?.metrics ?? []}
                  budget={budget}
                  source={entry.source}
                  factSource={s1 ? s1.source : null}
                />
              ) : (
                <p className="text-sm text-muted-foreground" data-state="empty">
                  S2 measured no budget in this run.
                </p>
              ),
            )}
            {s2 ? (
              <p className="text-xs text-muted-foreground">
                <Link
                  to={`/d2/runs/${s2.source.runId}/suites/S2#arms`}
                  className="underline underline-offset-3"
                >
                  Every budget, the stale-answer rate and instruction persistence
                </Link>{" "}
                are on S2's page.
              </p>
            ) : null}
            {s2 && budget ? (
              <>
                <h4 className="pt-2 text-sm font-medium">Paired with the reference</h4>
                {blockPanel("S2", (blocks) => (
                  <PairedPanel entries={blocks.scripted} budget={budget} source={s2.source} />
                ))}
                <h4 className="pt-2 text-sm font-medium">Where the needed facts were</h4>
                {blockPanel("S2", (blocks) => (
                  <AttributionPanel entries={blocks.scripted} budget={budget} source={s2.source} />
                ))}
              </>
            ) : null}
          </section>
          <section aria-labelledby="documents-heading" className="space-y-3">
            <h3 id="documents-heading" className="text-sm font-medium">
              Over long documents (S4)
            </h3>
            {panel("S4", (entry) => (
              <LongContextPanel metrics={entry.metrics} source={entry.source} />
            ))}
            {s4 ? (
              <>
                <h4 className="pt-2 text-sm font-medium">
                  Paired with the reference over documents
                </h4>
                {blockPanel("S4", (blocks) => (
                  <LongContextPairedPanel entries={blocks.lq} source={s4.source} />
                ))}
              </>
            ) : null}
          </section>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-10 xl:grid-cols-2">
            <section aria-labelledby="unreliability-heading" className="min-w-0 space-y-3">
              <h3 id="unreliability-heading" className="text-sm font-medium">
                How much repeated samples vary (S3)
              </h3>
              {panel("S3", (entry) => {
                const tier = headlineBudget(
                  entry.metrics.map((metric) =>
                    metric.id === "s3.aptitude" ? { ...metric, id: "s2.aptitude" } : metric,
                  ),
                )
                return tier ? (
                  <UnreliabilityPanel metrics={entry.metrics} budget={tier} source={entry.source} />
                ) : (
                  <p className="text-sm text-muted-foreground" data-state="empty">
                    S3 measured no budget in this run.
                  </p>
                )
              })}
            </section>
            <section aria-labelledby="cost-heading" className="min-w-0 space-y-3">
              <h3 id="cost-heading" className="text-sm font-medium">
                What a correct answer costs (S5)
              </h3>
              {panel("S5", (entry) =>
                budget ? (
                  <CostPanel metrics={entry.metrics} budget={budget} source={entry.source} />
                ) : (
                  <p className="text-sm text-muted-foreground" data-state="empty">
                    No budget to read S5 at: S2 is not in the runs read.
                  </p>
                ),
              )}
            </section>
          </div>
          <section aria-labelledby="loop-heading" className="space-y-3">
            <h3 id="loop-heading" className="text-sm font-medium">
              With the model's own replies as history (S6)
            </h3>
            {panel("S6", (entry) => {
              const state = blocksOf("S6")
              return (
                <LoopPanel
                  metrics={entry.metrics}
                  source={entry.source}
                  blocks={state.status === "ok" ? state.blocks.loop : []}
                  blocksStatus={state.status}
                />
              )
            })}
          </section>
          <p className="max-w-prose text-sm text-muted-foreground" data-note="suite-pages">
            The breakdowns by family, conversation length and rule, by question kind and format, the
            abstentions, the under-count by prompt size, the replies' length and the model's calls
            are on the suite pages:{" "}
            {(
              [
                ["S2", s2, "breakdowns"],
                ["S4", s4, "breakdowns"],
                ["S5", s5, "cost"],
                ["S6", s6, "loop"],
              ] as const
            )
              .flatMap(([suite, entry, anchor]) => (entry ? [{ suite, entry, anchor }] : []))
              .map(({ suite, entry, anchor }, i, all) => (
                <span key={suite}>
                  <Link
                    to={`/d2/runs/${entry.source.runId}/suites/${suite}#${anchor}`}
                    className="underline underline-offset-3"
                  >
                    {suite}'s{" "}
                    {anchor === "cost" ? "cost" : anchor === "loop" ? "loop" : "breakdowns"}
                  </Link>
                  {i < all.length - 1 ? ", " : "."}
                </span>
              ))}
          </p>
        </div>
      </PageSection>

      <PageSection
        id="trust"
        title="How far to trust it"
        description="The checks the evidence itself passed, then what the write-up says of its own limits."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
          {pending && checkSources.length === 0 ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ChecksGrid checks={checks(checkSources)} />
          )}
          <TrustNotes />
        </div>
      </PageSection>

      <PageSection
        id="drill-down"
        title="The drill-down"
        description="Every number behind this page."
      >
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm" data-links>
          <li>
            <Link to="/d2/runs" className="underline underline-offset-3">
              Every run
            </Link>
          </li>
          {QUESTIONS.map((words) => (
            <li key={words.id}>
              <Link to={`/d2/${words.id}`} className="underline underline-offset-3">
                {words.title}
              </Link>
            </li>
          ))}
          {view.runs.map((run) => (
            <li key={run.run_id}>
              <Link to={`/d2/runs/${run.run_id}`} className="underline underline-offset-3">
                Run <span className="font-mono">{run.run_id}</span>
              </Link>
            </li>
          ))}
          {domain?.writeUp ? (
            <li>
              <a
                href={sourceUrl(domain.writeUp.file)}
                rel="noreferrer"
                className="underline underline-offset-3"
              >
                The write-up
              </a>
            </li>
          ) : null}
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
