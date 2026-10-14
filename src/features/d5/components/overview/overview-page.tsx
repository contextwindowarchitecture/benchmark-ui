// The Domain 5 overview (the UI-D5 plan; DESIGN.md 4.5): the claim, the answer in words, the
// evidence in the domain's two kinds of claim (what CWA guarantees by construction, then what one
// model does with it), how far to trust it, and the drill-down, over the composite of the runs
// each suite is read from. Every panel names its run; words come from the content files, numbers
// from the records.

import type { ReactNode } from "react"
import { Link } from "react-router"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { DataRegion } from "@/components/dashboard/data-region"
import { Skeleton } from "@/components/ui/skeleton"
import { domainById, sourceUrl } from "@/content"
import { QUESTIONS } from "@/content/d5/questions"
import {
  CONCLUSION,
  CONCLUSIONS,
  CONCLUSIONS_CITATION,
  KINDS_OF_CLAIM,
  QUESTION,
} from "@/content/d5/trust"
import { useDomainRunsIndex } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { D5RunsIndexV1 } from "@/data/schema/generated"
import { ArmLegend } from "@/features/d2/components/arm-label"
import { GroupedArmTable } from "@/features/d2/components/grouped-arm-table"
import { MetricValue } from "@/features/d2/components/metric-value"
import { ChecksGrid } from "@/features/d2/components/overview/trust-section"
import { MetricPlot } from "@/features/d2/components/questions/share-plot"
import { percentTick } from "@/features/d2/components/evidence/arm-groups"
import { metricText } from "@/features/d2/model/metric-text"
import { pairedMetrics } from "@/features/d5/model/metrics"
import { adaptiveRows, armRows, forgedRows, structureChecks } from "@/features/d5/model/overview"
import { d5OverviewParams } from "@/features/d5/model/url"
import {
  NoRunsNotice,
  PassedOverNotice,
  RunPin,
  SourceNote,
  SuitePanel,
  UnknownPinNotice,
  UnreadableNotice,
} from "@/features/shared/evidence/evidence-states"
import { SourcesTable } from "@/features/shared/evidence/sources-table"
import { useArmVocabulary } from "@/features/shared/vocabulary"
import { formatPercent } from "@/lib/format"
import { useUrlState } from "@/lib/url-state"

import { PairedMetricsTable } from "../metric-tables"
import { useEvidence, type SuiteEvidence } from "../use-evidence"
import { D5TrustNotes } from "./trust-section"

const domain = domainById("d5")

export function D5OverviewPage() {
  const runsIndex = useDomainRunsIndex("d5")
  const [params, setParams] = useUrlState(d5OverviewParams)
  const region = regionOfDocument(runsIndex, "d5/index.json", "the runs index")
  return (
    <DashboardPage
      title={`Domain 5 · ${domain?.title ?? "Instruction hierarchy and indirect prompt injection"}`}
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

const rate = (value: number) => formatPercent(value)

function Overview({ index, pin }: { index: D5RunsIndexV1; pin: string | undefined }) {
  const evidence = useEvidence(index, pin, [])
  const { view, sizes, pending, failed } = evidence
  const panel = (suite: string, render: (entry: SuiteEvidence) => ReactNode) => (
    <SuitePanel evidence={evidence} suite={suite}>
      {render}
    </SuitePanel>
  )
  const checkSources = ["S0", "S1", "S7"].flatMap((suite) => {
    const entry = evidence.metricsOf(suite)
    return entry ? [{ runId: entry.source.runId, metrics: entry.metrics }] : []
  })

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10">
      <UnknownPinNotice view={view} />

      <PageSection
        id="claim"
        title="The claim"
        description="What Domain 5 is designed to establish about CWA, and the question it asks."
      >
        <p className="max-w-prose text-lg leading-snug font-medium">{domain?.claim}</p>
        <div className="max-w-prose space-y-2 text-sm">
          <p>{QUESTION.question}</p>
          <p className="text-muted-foreground">{QUESTION.heldEqual}</p>
        </div>
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2" data-kinds>
          {KINDS_OF_CLAIM.map((kind) => (
            <li key={kind.id} className="rounded-lg border p-4 text-sm">
              <h3 className="font-medium">{kind.title}</h3>
              <p className="mt-1 text-muted-foreground">{kind.text}</p>
            </li>
          ))}
        </ul>
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
            <li key={note.id} className="rounded-lg border p-4 text-sm">
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
        id="structure"
        title="What CWA guarantees by construction"
        description="Checked by code on every payload before any is sent, with no model (S1), beside what the conventional payloads let through. Each panel names its run."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
          {pending && checkSources.length === 0 ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ChecksGrid checks={structureChecks(checkSources)} />
          )}
          <section aria-labelledby="forged-heading" className="space-y-3">
            <h3 id="forged-heading" className="text-sm font-medium">
              What the conventional payloads let through (S1)
            </h3>
            {panel("S1", (entry) => (
              <ForgedPanel entry={entry} />
            ))}
          </section>
        </div>
      </PageSection>

      <PageSection
        id="evidence"
        title="What the model does with it"
        description="One model's behaviour, as estimates with the harness's intervals, against static, human and adaptive attackers. Each panel names its run."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
          <ArmLegend />
          <section aria-labelledby="static-heading" className="space-y-3">
            <h3 id="static-heading" className="text-sm font-medium">
              Static attacks (S2)
            </h3>
            {panel("S2", (entry) => (
              <div className="space-y-4">
                <MetricPlot
                  rows={armRows(entry.metrics, "s2.asr")}
                  title="Attacks executed per arm"
                  summary="Each arm's share of the main grid's attacks that the model carried out, over every attack present in the payload and observable in the reply, with its 95% cluster-bootstrap interval over task instances."
                  legend="attacks executed (S2)"
                  header="Attacks executed"
                  mark="dot"
                  domain="auto"
                  format={rate}
                  formatTick={percentTick}
                />
                <PairedMetricsTable
                  entries={pairedMetrics(entry.metrics, "S2")}
                  label="The controlled pairs, static attacks"
                />
                <SourceNote source={entry.source} />
              </div>
            ))}
          </section>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-10 xl:grid-cols-2">
            <section aria-labelledby="human-heading" className="min-w-0 space-y-3">
              <h3 id="human-heading" className="text-sm font-medium">
                Attacks people wrote (S3)
              </h3>
              {panel("S3", (entry) => (
                <div className="space-y-2">
                  <MetricPlot
                    rows={armRows(entry.metrics, "s3.llmail_asr")}
                    title="LLMail-Inject's emails that succeeded per arm"
                    summary="Each arm's share of LLMail-Inject's attacker emails, written by people in a public challenge against other models and defences, that made the model send the attacker's email, with its interval over the submitting teams."
                    legend="LLMail-Inject attacks succeeded (S3)"
                    header="Succeeded"
                    mark="dot"
                    domain="auto"
                    format={rate}
                    formatTick={percentTick}
                  />
                  <SourceNote source={entry.source} />
                </div>
              ))}
            </section>
            <section aria-labelledby="persist-heading" className="min-w-0 space-y-3">
              <h3 id="persist-heading" className="text-sm font-medium">
                A poisoned document in a long conversation (S6)
              </h3>
              {panel("S6", (entry) => (
                <div className="space-y-2">
                  <MetricPlot
                    rows={armRows(entry.metrics, "s6.persistence")}
                    title="The attack's code word in later replies per arm"
                    summary="Each way of carrying a conversation forward: the share of replies after the poisoned turn that still carried out the document's code word, with its interval over conversations."
                    legend="code word in later replies (S6)"
                    header="Code word later"
                    mark="bar"
                    domain="auto"
                    format={rate}
                    formatTick={percentTick}
                  />
                  <SourceNote source={entry.source} />
                </div>
              ))}
            </section>
          </div>
          <section aria-labelledby="adaptive-heading" className="space-y-3">
            <h3 id="adaptive-heading" className="text-sm font-medium">
              An attacker that adapts (S4)
            </h3>
            {panel("S4", (entry) => (
              <AdaptivePanel entry={entry} />
            ))}
          </section>
          <p className="max-w-prose text-sm text-muted-foreground" data-note="question-pages">
            Each question has a page with every panel behind it:{" "}
            {QUESTIONS.map((words, i) => (
              <span key={words.id}>
                <Link to={`/d5/${words.id}`} className="underline underline-offset-3">
                  {words.title}
                </Link>
                {i < QUESTIONS.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </div>
      </PageSection>

      <PageSection
        id="trust"
        title="How far to trust it"
        description="What the domain does not claim, where the viability document promises more than the specification has, how it judges an answer, its own limits and what the run corrected."
      >
        <D5TrustNotes />
      </PageSection>

      <PageSection
        id="drill-down"
        title="The drill-down"
        description="Every number behind this page."
      >
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm" data-links>
          <li>
            <Link to="/d5/runs" className="underline underline-offset-3">
              Every run
            </Link>
          </li>
          {QUESTIONS.map((words) => (
            <li key={words.id}>
              <Link to={`/d5/${words.id}`} className="underline underline-offset-3">
                {words.title}
              </Link>
            </li>
          ))}
          {view.runs.map((run) => (
            <li key={run.run_id}>
              <Link to={`/d5/runs/${run.run_id}`} className="underline underline-offset-3">
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

/** Per conventional arm: payloads whose structure a tag attack forged, and raw turn markers. */
function ForgedPanel({ entry }: { entry: SuiteEvidence }) {
  const vocabulary = useArmVocabulary()
  const rows = forgedRows(entry.metrics)
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        S1 read no baseline for forged structure in this run.
      </p>
    )
  }
  const byArm = new Map(rows.map((row) => [row.arm, row]))
  return (
    <div className="space-y-2">
      <GroupedArmTable
        label="Forged structure in the conventional payloads"
        caption="Per conventional arm: the payloads whose own boundary a tag attack forged, and the payloads that hand the model a marker attack's chat-template markers as raw text. The CWA arms escape both, so none appears here."
        arms={rows.map((row) => ({ id: row.arm, group: vocabulary.groupOf(row.arm) }))}
        columns={[
          { key: "forged", label: "Boundary forged by a tag attack" },
          { key: "markers", label: "Raw turn markers sent" },
        ]}
        cell={(arm, column) => {
          const metric = column === "forged" ? byArm.get(arm)?.forged : byArm.get(arm)?.markers
          return metric
            ? { node: <MetricValue metric={metric} />, text: metricText(metric, vocabulary.points) }
            : null
        }}
      />
      <p className="text-xs text-muted-foreground">
        A dash is an arm with no boundary of its own to forge. Whether the served tokenizer reads a
        forged marker as a real one is S1's special-token check, on its suite page.
      </p>
      <SourceNote source={entry.source} />
    </div>
  )
}

/** Per arm: the adaptive attacker's held-out success at its full budget, beside the static rate. */
function AdaptivePanel({ entry }: { entry: SuiteEvidence }) {
  const vocabulary = useArmVocabulary()
  const { budget, rows } = adaptiveRows(entry.metrics)
  if (!budget || rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        S4 measured no adaptive attack in this run.
      </p>
    )
  }
  const byArm = new Map(rows.map((row) => [row.arm, row]))
  const budgetWords = vocabulary.tierLabel(budget, "s4.asr_by_budget")
  return (
    <div className="space-y-2">
      <MetricPlot
        rows={armRows(entry.metrics, "s4.asr_by_budget", budget)}
        title={`Adaptive attack success per arm after ${budgetWords}`}
        summary={`Each arm's held-out success of the best attack an adaptive attacker found within ${budgetWords}, with its interval over task instances. Every arm falls to an attacker that adapts; the static rate for the same goal is in the table.`}
        legend="adaptive attacks executed (S4)"
        header="Adaptive"
        mark="dot"
        domain={[0, 1]}
        format={rate}
        formatTick={percentTick}
      />
      <GroupedArmTable
        label={`Static and adaptive attack success after ${budgetWords}`}
        caption="Each arm's static success for the hijack goal (S2's templates) beside the adaptive attacker's held-out success."
        arms={rows.map((row) => ({ id: row.arm, group: vocabulary.groupOf(row.arm) }))}
        columns={[
          { key: "static", label: "Static" },
          { key: "adaptive", label: "Adaptive" },
        ]}
        cell={(arm, column) => {
          const row = byArm.get(arm)
          const metric = column === "static" ? row?.static : row?.adaptive
          return metric
            ? { node: <MetricValue metric={metric} />, text: metricText(metric, vocabulary.points) }
            : null
        }}
      />
      <SourceNote source={entry.source} />
    </div>
  )
}
