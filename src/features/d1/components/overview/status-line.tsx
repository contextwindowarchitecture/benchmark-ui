import type { UseQueryResult } from "@tanstack/react-query"
import { Link } from "react-router"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { Digest } from "@/components/dashboard/digest"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { CiReportV1, ManifestV1 } from "@/data/schema/generated"
import type { SourceError } from "@/data/source"
import type { ParseResultOf } from "@/data/validate"
import type { RunEntry } from "@/features/d1/model/runs"
import { adapterProvenance } from "@/features/d1/model/run"
import { formatUtc, isoUtc } from "@/lib/format"

/**
 * The status line under the claim (ui-plan.md 8.1, item 1): the contract commit and spec draft,
 * the adapters' commits and toolchains, the two runs with their dates, and the nightly's drift
 * verdict, every one read from the records.
 */
export function StatusLine({
  nightly,
  s7,
  manifest,
  ci,
}: {
  nightly: RunEntry | undefined
  s7: RunEntry | undefined
  manifest: UseQueryResult<ParseResultOf<"manifest">, SourceError> | undefined
  ci: UseQueryResult<ParseResultOf<"ci-report">, SourceError> | undefined
}) {
  const document: ManifestV1 | undefined = manifest?.data?.ok ? manifest.data.document : undefined
  const report: CiReportV1 | undefined = ci?.data?.ok ? ci.data.document : undefined
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]" data-status-line>
      <dt className="text-muted-foreground">Contract</dt>
      <dd>
        {manifest?.isPending ? (
          <Skeleton className="h-5 w-64" aria-label="Loading the contract commit" />
        ) : document ? (
          <span className="flex flex-wrap items-center gap-x-2">
            <span>{document.contract.repository}</span>
            <Digest
              value={document.contract.commit ?? document.contract.pinned}
              label="contract commit"
            />
            <span className="text-muted-foreground">spec draft {document.contract.spec_draft}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">not available</span>
        )}
      </dd>
      <dt className="text-muted-foreground">Adapters</dt>
      <dd>
        {manifest?.isPending ? (
          <Skeleton className="h-5 w-96 max-w-full" aria-label="Loading the adapters" />
        ) : document ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {adapterProvenance(document).map((adapter) => (
              <li key={adapter.id} className="inline-flex flex-wrap items-center gap-x-1.5">
                <AdapterMark adapter={adapter.id} />
                {adapter.commit ? (
                  <Digest value={adapter.commit} label={`${adapter.id} commit`} />
                ) : null}
                {adapter.toolchain ? (
                  <span className="text-xs text-muted-foreground">{adapter.toolchain}</span>
                ) : null}
                {!adapter.available ? <StatusBadge status="unavailable" /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-muted-foreground">not available</span>
        )}
      </dd>
      <dt className="text-muted-foreground">Nightly run</dt>
      <dd>
        <RunLine run={nightly} />
      </dd>
      <dt className="text-muted-foreground">S7 run</dt>
      <dd>
        <RunLine run={s7} />
      </dd>
      <dt className="text-muted-foreground">Drift</dt>
      <dd>
        {ci?.isPending ? (
          <Skeleton className="h-5 w-48" aria-label="Loading the drift verdict" />
        ) : report ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={report.verdict} />
            <span className="text-muted-foreground">
              {report.previous ? (
                <>
                  against{" "}
                  <Link
                    to={`/d1/runs/${report.previous.run_id}`}
                    className="font-mono underline underline-offset-3"
                  >
                    {report.previous.run_id}
                  </Link>
                  {nightly ? (
                    <>
                      {" · "}
                      <Link
                        to={`/d1/compare?from=${report.previous.run_id}&to=${nightly.run_id}`}
                        className="underline underline-offset-3"
                      >
                        compare
                      </Link>
                    </>
                  ) : null}
                </>
              ) : (
                "the baseline: no previous run of its profile"
              )}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">no drift report in the nightly run</span>
        )}
      </dd>
    </dl>
  )
}

function RunLine({ run }: { run: RunEntry | undefined }) {
  if (!run) return <span className="text-muted-foreground">none in the index</span>
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <Link to={`/d1/runs/${run.run_id}`} className="font-mono underline underline-offset-3">
        {run.run_id}
      </Link>
      <StatusBadge status={run.status} />
      <time dateTime={isoUtc(run.started_at)} className="text-muted-foreground">
        {formatUtc(run.started_at)}
      </time>
    </span>
  )
}
