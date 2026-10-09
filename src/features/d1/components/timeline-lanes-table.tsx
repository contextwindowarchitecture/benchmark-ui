import { Outcome } from "@/components/dashboard/outcome"
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
import type { TimelineV1 } from "@/data/schema/generated"
import { formatCount } from "@/lib/format"

/**
 * The eight stages as rows with the events in sequence (ui-plan.md 9.2's lanes), as a table: the
 * text alternative of the pipeline walk, and the whole view where the walk is not loaded.
 */
export function TimelineLanesTable({ timeline }: { timeline: TimelineV1 }) {
  const byStage = new Map<string, TimelineV1["events"]>()
  for (const lane of timeline.lanes) byStage.set(lane, [])
  for (const event of [...timeline.events].sort((a, b) => a.seq - b.seq)) {
    const list = byStage.get(event.stage) ?? []
    list.push(event)
    byStage.set(event.stage, list)
  }
  const inferred = timeline.events.filter((event) => event.order === "inferred").length
  return (
    <div className="space-y-1" data-timeline-table>
      <h3 className="text-sm font-medium">Timeline</h3>
      <p className="text-xs text-muted-foreground">
        <Outcome value={timeline.outcome} />
        {timeline.refusal_reason ? ` ${timeline.refusal_reason}` : ""} ·{" "}
        {formatCount(timeline.counters.candidates)} candidates,{" "}
        {formatCount(timeline.counters.admitted)} admitted,{" "}
        {formatCount(timeline.counters.included)} included,{" "}
        {formatCount(timeline.counters.compressed)} compressed,{" "}
        {formatCount(timeline.counters.omitted)} omitted
        {inferred > 0 ? `; ${formatCount(inferred)} events in inferred order` : ""}.
      </p>
      <TableRegion label="Timeline lanes table" className="rounded-lg">
        <Table>
          <TableCaption className="sr-only">Events per pipeline stage, in sequence.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Stage</TableHead>
              <TableHead>Events</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...byStage.entries()].map(([stage, events]) => (
              <TableRow key={stage} data-lane={stage}>
                <TableCell className="align-top font-mono text-xs">{stage}</TableCell>
                <TableCell className="align-top text-xs">
                  {events.length === 0 ? (
                    <span className="text-muted-foreground">no events at this stage</span>
                  ) : (
                    <ol className="space-y-0.5">
                      {events.map((event) => (
                        <li
                          key={event.seq}
                          className={
                            event.order === "inferred" ? "italic text-muted-foreground" : undefined
                          }
                          title={
                            event.order === "inferred"
                              ? "order inferred by the harness"
                              : "order exact"
                          }
                        >
                          <span className="tabular text-muted-foreground">{event.seq}</span>{" "}
                          {event.type}
                          {event.order === "inferred" ? " (inferred)" : ""}
                        </li>
                      ))}
                    </ol>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRegion>
    </div>
  )
}
