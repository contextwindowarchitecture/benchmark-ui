import { DataRegion, type RegionState } from "@/components/dashboard/data-region"
import { TableRegion } from "@/components/dashboard/table-region"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { attackFamilyWords, taskFamilyWords } from "@/content/d5/vocabulary"
import { useRunDocument, useRunDocuments } from "@/data/queries"
import type { D5RunIndexV1, D5TaskIndexV1 } from "@/data/schema/generated"
import { formatCount, shortDigest } from "@/lib/format"

const filesOf = (index: D5RunIndexV1, kind: string) =>
  index.files.filter((file) => file.kind === kind).map((file) => file.path)

/**
 * What a Domain 5 run generated (the UI-D5 plan): each task family's instances at their size, the
 * attack templates, and the external sets' samples, from the indexes the run writes beside them.
 */
export function D5RunGenerated({ runId, index }: { runId: string; index: D5RunIndexV1 }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
      <RunTasks runId={runId} paths={filesOf(index, "task-index")} />
      <RunAttacks runId={runId} path={filesOf(index, "attack-index")[0]} />
      <RunExternal runId={runId} path={filesOf(index, "external-index")[0]} />
    </div>
  )
}

function RunTasks({ runId, paths }: { runId: string; paths: string[] }) {
  const queries = useRunDocuments(runId, paths, "d5/task-index")
  const region: RegionState<D5TaskIndexV1[]> =
    paths.length === 0
      ? { status: "absent", what: "The task indexes" }
      : queries.some((query) => query.isPending)
        ? { status: "loading" }
        : {
            status: "ok",
            data: queries.flatMap((query) => (query.data?.ok ? [query.data.document] : [])),
          }
  return (
    <DataRegion state={region} label="the tasks" skeleton={<Skeleton className="h-40 w-full" />}>
      {(indexes) => (
        <TableRegion label="Tasks table">
          <Table>
            <TableCaption className="sr-only">
              Each task family's generated instances, their size and their variants.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Family</TableHead>
                <TableHead scope="col">Size</TableHead>
                <TableHead scope="col">Generator</TableHead>
                <TableHead scope="col" className="text-right">
                  Plain
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Benign imperative
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indexes.map((task) => {
                const family = taskFamilyWords(task.family)
                const count = (variant: string) =>
                  task.tasks.filter((entry) => entry.variant === variant).length
                return (
                  <TableRow key={task.family} data-family={task.family}>
                    <TableCell className="align-top">
                      <div className="font-medium">
                        {family ? `${family.code} · ${family.title}` : task.family}
                      </div>
                      {family ? (
                        <div className="max-w-prose text-xs text-muted-foreground">
                          {family.text}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="outline">{task.size}</Badge>
                    </TableCell>
                    <TableCell className="align-top font-mono text-xs">
                      {task.generator.name} v{task.generator.version}
                      <div className="text-muted-foreground">seed {task.seed}</div>
                    </TableCell>
                    <TableCell className="tabular text-right align-top">
                      {formatCount(count("plain"))}
                    </TableCell>
                    <TableCell className="tabular text-right align-top">
                      {formatCount(count("imperative"))}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableRegion>
      )}
    </DataRegion>
  )
}

function RunAttacks({ runId, path }: { runId: string; path: string | undefined }) {
  const query = useRunDocument(path ? runId : undefined, path ?? "", "d5/attack-index")
  if (!path) {
    return (
      <DataRegion state={{ status: "absent", what: "The attack index" }} label="the attacks">
        {() => null}
      </DataRegion>
    )
  }
  if (query.isPending) return <Skeleton className="h-32 w-full" />
  if (!query.data?.ok) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        The attack index could not be read.
      </p>
    )
  }
  const attacks = query.data.document
  return (
    <div className="space-y-2">
      <TableRegion label="Attacks table">
        <Table>
          <TableCaption className="sr-only">
            Each attack family and its templates, the test half every suite sends and the train half
            only the adaptive attacker reads.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Attack family</TableHead>
              <TableHead scope="col" className="text-right">
                Test templates
              </TableHead>
              <TableHead scope="col" className="text-right">
                Train templates
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attacks.families.map((id) => {
              const family = attackFamilyWords(id)
              const templates = attacks.templates.filter((template) => template.family === id)
              return (
                <TableRow key={id} data-attack={id}>
                  <TableCell className="align-top">
                    <div className="font-medium">
                      {family ? `${family.code} · ${family.title}` : id}
                    </div>
                    {family ? (
                      <div className="max-w-prose text-xs text-muted-foreground">{family.text}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="tabular text-right align-top">
                    {formatCount(templates.filter((t) => t.split === "test").length)}
                  </TableCell>
                  <TableCell className="tabular text-right align-top">
                    {formatCount(templates.filter((t) => t.split === "train").length)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableRegion>
      <p className="text-xs text-muted-foreground">
        Marker attacks forge the served model's chat template ({attacks.chat_template}); seed{" "}
        {attacks.seed}.
      </p>
    </div>
  )
}

function RunExternal({ runId, path }: { runId: string; path: string | undefined }) {
  const query = useRunDocument(path ? runId : undefined, path ?? "", "d5/external-index")
  if (!path) {
    return (
      <p className="text-sm text-muted-foreground" data-state="absent">
        This run sent no external set.
      </p>
    )
  }
  if (query.isPending) return <Skeleton className="h-24 w-full" />
  if (!query.data?.ok) {
    return (
      <p className="text-sm text-muted-foreground" data-state="empty">
        The external sets' index could not be read.
      </p>
    )
  }
  const external = query.data.document
  return (
    <TableRegion label="External sets table">
      <Table>
        <TableCaption className="sr-only">
          Each external set: where it was copied from, at which revision, and the probes sampled.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Set</TableHead>
            <TableHead scope="col">Source</TableHead>
            <TableHead scope="col" className="text-right">
              Probes
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(external.sets)
            .flatMap(([id, set]) => (set ? [[id, set] as const] : []))
            .map(([id, set]) => (
              <TableRow key={id} data-set={id}>
                <TableCell className="align-top font-medium">
                  {id === "sep" ? "SEP" : id === "llmail" ? "LLMail-Inject" : id}
                  <div>
                    <Badge variant="outline">{external.size}</Badge>
                  </div>
                </TableCell>
                <TableCell className="align-top text-xs">
                  <a href={set.source} rel="noreferrer" className="underline underline-offset-3">
                    {set.source}
                  </a>
                  <div className="font-mono text-muted-foreground">
                    at {shortDigest(set.revision)}
                  </div>
                </TableCell>
                <TableCell className="tabular text-right align-top">
                  {formatCount(set.probes.length)}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableRegion>
  )
}
