import { TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { AdapterMark } from "@/components/dashboard/adapter-mark"
import { DataRegion } from "@/components/dashboard/data-region"
import { Digest } from "@/components/dashboard/digest"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TableRegion } from "@/components/dashboard/table-region"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useRunDocument } from "@/data/queries"
import { regionOfDocument } from "@/data/region"
import type { ManifestV1 } from "@/data/schema/generated"
import { adapterProvenance, provenanceWarnings } from "@/features/d1/model/run"
import { formatCount, formatMs } from "@/lib/format"

function Field({
  label,
  children,
  mono = false,
}: {
  label: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          mono ? "min-w-0 font-mono text-xs break-all whitespace-pre-line" : "min-w-0 break-words"
        }
      >
        {children}
      </dd>
    </>
  )
}

const list = "grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_minmax(0,1fr)]"

export function RunProvenance({ runId }: { runId: string }) {
  const manifest = useRunDocument(runId, "manifest.json", "manifest")
  const region = regionOfDocument(manifest, `${runId}/manifest.json`, "the manifest")
  return (
    <DataRegion state={region} label="the manifest" skeleton={<Skeleton className="h-64 w-full" />}>
      {(document) => <Provenance manifest={document} />}
    </DataRegion>
  )
}

function Provenance({ manifest }: { manifest: ManifestV1 }) {
  const warnings = provenanceWarnings(manifest)
  const adapters = adapterProvenance(manifest)
  const { contract, harness, config, host, container, settings, ci } = manifest
  const images =
    container && typeof container["images"] === "object" && container["images"] !== null
      ? (container["images"] as Record<string, unknown>)
      : null
  return (
    <div className="grid gap-4">
      {warnings.length > 0 ? (
        <Alert data-state="warnings">
          <TriangleAlert className="text-warning" />
          <AlertTitle>
            {warnings.length} provenance {warnings.length === 1 ? "warning" : "warnings"}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((warning) => (
                <li key={warning.id}>{warning.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Harness and contract</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className={list}>
              <Field label="Harness">
                {harness.name} {harness.version} · Python {harness.python}
              </Field>
              <Field label="Source digest">
                <Digest value={harness.source_digest} label="source digest" />
              </Field>
              <Field label="Config">
                <Digest value={config.sha256} label="config hash" />{" "}
                <span className="text-muted-foreground">({config.copy})</span>
              </Field>
              <Field label="Contract pinned">
                <Digest value={contract.pinned} label="pinned contract commit" />
              </Field>
              <Field label="Contract actual">
                {contract.commit ? (
                  <span className="inline-flex items-center gap-2">
                    <Digest value={contract.commit} label="contract commit" />
                    {contract.commit !== contract.pinned ? (
                      <StatusBadge status="warning" label="not the pinned commit" />
                    ) : null}
                    {contract.dirty ? <StatusBadge status="warning" label="dirty" /> : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground">not recorded</span>
                )}
              </Field>
              <Field label="Repository">
                {contract.repository ?? contract.remote ?? (
                  <span className="text-muted-foreground">not recorded</span>
                )}
              </Field>
              <Field label="Spec draft">
                {contract.spec_draft ?? <span className="text-muted-foreground">not recorded</span>}
              </Field>
              <Field label="CI">
                {ci ? (
                  <>
                    {ci.profile} profile, from {ci.source}
                  </>
                ) : (
                  <span className="text-muted-foreground">not a CI profile run</span>
                )}
              </Field>
              <Field label="Settings">
                timeout {formatMs(settings.timeout_s * 1000)} · concurrency{" "}
                {formatCount(settings.concurrency)}
                {manifest.seed !== null ? ` · seed ${manifest.seed}` : ""}
              </Field>
              <Field label="Command" mono>
                {manifest.command.join(" ")}
              </Field>
            </dl>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Host and container</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className={list}>
              <Field label="Host">
                {host.system} {host.release} · {host.machine} ·{" "}
                {host.cpus === null ? "cpus unknown" : `${host.cpus} cpus`}
              </Field>
              <Field label="Platform">{host.platform}</Field>
              {manifest.host_suspended_seconds > 0 ? (
                <Field label="Suspended">{manifest.host_suspended_seconds} s</Field>
              ) : null}
              <Field label="Container">
                {container ? (
                  <span className="font-mono text-xs break-all">
                    {String(container["tag"] ?? "")}
                    {typeof container["platform"] === "string" ? ` · ${container["platform"]}` : ""}
                    {typeof container["variant"] === "string" ? ` · ${container["variant"]}` : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">none</span>
                )}
              </Field>
              {images ? (
                <Field label="Images" mono>
                  {Object.entries(images)
                    .map(([role, image]) => `${role}: ${String(image)}`)
                    .join("\n")}
                </Field>
              ) : null}
              <Field label="Environment cells">
                {manifest.env_cells.length === 0 ? (
                  <span className="text-muted-foreground">none</span>
                ) : (
                  <ul className="flex flex-wrap gap-1" aria-label="Environment cells">
                    {manifest.env_cells.map((cell) => (
                      <li key={cell}>
                        <Badge variant="outline" className="font-mono text-[0.7rem]">
                          {cell}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            </dl>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Adapters</CardTitle>
        </CardHeader>
        <CardContent>
          <TableRegion label="Adapters table" className="rounded-none border-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adapter</TableHead>
                  <TableHead>Implementation</TableHead>
                  <TableHead>Commit</TableHead>
                  <TableHead>Toolchain</TableHead>
                  <TableHead>Build</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adapters.map((adapter) => {
                  const implementation = adapter.implementation ?? null
                  return (
                    <TableRow key={adapter.id} data-adapter={adapter.id}>
                      <TableCell className="align-top">
                        <AdapterMark adapter={adapter.id} />
                        {!adapter.available ? (
                          <div className="mt-1">
                            <StatusBadge status="unavailable" />
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        {implementation ? (
                          <>
                            <span className="font-mono">
                              {String(implementation["name"] ?? "")}
                            </span>{" "}
                            {String(implementation["version"] ?? "")}
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            {adapter.error ?? "not recorded"}
                          </span>
                        )}
                        {adapter.repository ? (
                          <div className="text-muted-foreground">{adapter.repository}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top">
                        {adapter.commit ? (
                          <span className="inline-flex items-center gap-2">
                            <Digest value={adapter.commit} label={`${adapter.id} commit`} />
                            {adapter.dirty ? <StatusBadge status="warning" label="dirty" /> : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        {adapter.toolchain ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="align-top font-mono text-xs">
                        {adapter.build && adapter.build.length > 0 ? (
                          <ul className="space-y-1">
                            {adapter.build.map((step, i) => (
                              <li key={i} className="break-all">
                                {step.argv.join(" ")}{" "}
                                <span className="text-muted-foreground">
                                  (exit {step.exit_code}, {formatMs(step.seconds * 1000)})
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {adapter.timing?.command ? (
                          <div className="mt-1 text-muted-foreground">
                            timing: {adapter.timing.command.join(" ")}
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableRegion>
        </CardContent>
      </Card>
    </div>
  )
}
