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
import { familyWords } from "@/content/d2/vocabulary"
import { useRunDocuments } from "@/data/queries"
import type { D2ConversationIndexV1, D2LqIndexV1, D2RunIndexV1 } from "@/data/schema/generated"
import { scriptFiles } from "@/features/d2/model/suite"
import { formatCount } from "@/lib/format"

type Script =
  { kind: "conversations"; index: D2ConversationIndexV1 } | { kind: "corpora"; index: D2LqIndexV1 }

/**
 * What the run generated (the UI-D2 plan): each conversation family's scripts and the long-context
 * corpora, at their size (pilot or recorded), from the indexes the run writes beside them.
 */
export function D2RunScripts({ runId, index }: { runId: string; index: D2RunIndexV1 }) {
  const files = scriptFiles(index)
  const conversations = useRunDocuments(runId, files.conversations, "d2/conversation-index")
  const corpora = useRunDocuments(runId, files.corpora, "d2/lq-index")
  const queries = [...conversations, ...corpora]
  const region: RegionState<Script[]> =
    queries.length === 0
      ? { status: "absent", what: "The scripts' indexes" }
      : queries.some((query) => query.isPending)
        ? { status: "loading" }
        : {
            status: "ok",
            data: [
              ...conversations.flatMap((query): Script[] =>
                query.data?.ok ? [{ kind: "conversations", index: query.data.document }] : [],
              ),
              ...corpora.flatMap((query): Script[] =>
                query.data?.ok ? [{ kind: "corpora", index: query.data.document }] : [],
              ),
            ],
          }
  const unreadable = queries.filter((query) => query.isError || query.data?.ok === false).length
  return (
    <DataRegion state={region} label="the scripts" skeleton={<Skeleton className="h-40 w-full" />}>
      {(scripts) => (
        <div className="space-y-2">
          <TableRegion label="Scripts table">
            <Table>
              <TableCaption className="sr-only">
                Each family's generated scripts or corpora, their size and what they hold.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Family</TableHead>
                  <TableHead scope="col">Size</TableHead>
                  <TableHead scope="col">Generator</TableHead>
                  <TableHead scope="col">Shape</TableHead>
                  <TableHead scope="col" className="text-right">
                    Scripts
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Probes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scripts.map((script) => {
                  const family = familyWords(script.index.family)
                  return (
                    <TableRow key={script.index.family} data-family={script.index.family}>
                      <TableCell className="align-top">
                        <div className="font-medium">
                          {family ? `${family.code} · ${family.title}` : script.index.family}
                        </div>
                        {family ? (
                          <div className="max-w-prose text-xs text-muted-foreground">
                            {family.does}; a probe asks {family.asks}.
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline">{script.index.size}</Badge>
                      </TableCell>
                      <TableCell className="align-top font-mono text-xs">
                        {script.index.generator.name} v{script.index.generator.version}
                        <div className="text-muted-foreground">seed {script.index.seed}</div>
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        {script.kind === "conversations"
                          ? `${script.index.turn_counts.map(formatCount).join(", ")} turns, a probe every ${formatCount(script.index.checkpoint_every)}`
                          : `corpora of ${script.index.ratios.join(", ")} × the ${formatCount(script.index.budget)}-token budget`}
                      </TableCell>
                      <TableCell className="tabular text-right align-top">
                        {script.kind === "conversations"
                          ? formatCount(script.index.conversations.length)
                          : formatCount(script.index.corpora.length)}
                      </TableCell>
                      <TableCell className="tabular text-right align-top">
                        {script.kind === "conversations"
                          ? formatCount(
                              script.index.conversations.reduce((sum, c) => sum + c.probes, 0),
                            )
                          : formatCount(
                              script.index.corpora.reduce((sum, c) => sum + c.questions, 0),
                            )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableRegion>
          {unreadable > 0 ? (
            <p className="text-xs text-muted-foreground">
              {formatCount(unreadable)} of the run's script indexes could not be read.
            </p>
          ) : null}
        </div>
      )}
    </DataRegion>
  )
}
