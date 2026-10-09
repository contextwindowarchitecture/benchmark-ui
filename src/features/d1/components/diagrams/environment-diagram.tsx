import { useState } from "react"

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
import { environmentCells, type EnvironmentCell } from "@/features/d1/model/environment"
import type { MatrixCell } from "@/features/d1/model/suite"

import { DiagramFrame } from "./diagram-frame"

const TILE = { w: 176, h: 30, gap: 6 }
const COLUMN_GAP = 16
const HEADER = 26

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/**
 * The environment matrix as a picture (ui-plan.md 7.3): the cells S2 runs, as a grid of what each
 * changes, grouped by platform, from the suite summary's cells. Hover a tile for its description.
 */
export function EnvironmentDiagram({
  cells,
  runId,
  suite = "S2",
}: {
  cells: readonly MatrixCell[]
  runId: string
  suite?: string
}) {
  const groups = environmentCells(cells)
  const [active, setActive] = useState<EnvironmentCell | null>(null)
  const maxRows = Math.max(1, ...groups.map((group) => group.cells.length))
  const width = groups.length * TILE.w + Math.max(groups.length - 1, 0) * COLUMN_GAP + 2
  const height = HEADER + maxRows * (TILE.h + TILE.gap) + 4
  return (
    <DiagramFrame
      id="environment-diagram"
      title={`The environments: what ${suite} changes between answers`}
      description={
        <>
          Each cell changes one thing about where the assembler runs and compares every answer with
          the host's. From {suite} of run <span className="font-mono">{runId}</span>.
        </>
      }
      figure={
        groups.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-state="empty">
            No cells were run.
          </p>
        ) : (
          <div className="space-y-2">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="block h-auto w-full text-foreground"
              style={{ minWidth: Math.min(width, 640), maxWidth: width }}
            >
              {groups.map((group, column) => {
                const x = column * (TILE.w + COLUMN_GAP) + 1
                return (
                  <g
                    key={group.platform}
                    transform={`translate(${x},1)`}
                    data-platform={group.platform}
                  >
                    <text
                      x={2}
                      y={14}
                      className="fill-foreground font-mono text-[12px] font-medium"
                    >
                      {group.platform}
                    </text>
                    {group.cells.map((cell, row) => {
                      const y = HEADER + row * (TILE.h + TILE.gap)
                      const isActive =
                        active?.cell === cell.cell && active.platform === cell.platform
                      return (
                        <g
                          key={cell.cell}
                          transform={`translate(0,${y})`}
                          data-cell={cell.cell}
                          onMouseEnter={() => setActive(cell)}
                          onMouseLeave={() => setActive(null)}
                          className="cursor-help"
                        >
                          <title>{`${cell.cell}: ${cell.description}`}</title>
                          <rect
                            width={TILE.w}
                            height={TILE.h}
                            rx={6}
                            className={
                              isActive
                                ? "fill-primary/15 stroke-foreground"
                                : "fill-muted/60 stroke-border"
                            }
                          />
                          <text x={8} y={19} className="fill-foreground font-mono text-[11px]">
                            {clip(cell.cell, 24)}
                          </text>
                        </g>
                      )
                    })}
                  </g>
                )
              })}
            </svg>
            <p className="min-h-10 text-xs text-muted-foreground" data-cell-caption>
              {active ? (
                <>
                  <span className="font-mono text-foreground">{active.cell}</span> on{" "}
                  <span className="font-mono">{active.platform}</span>: {active.description}
                </>
              ) : (
                "Hover a cell for what it changes; every cell is listed in the table beside."
              )}
            </p>
          </div>
        )
      }
      equivalentTitle="Every cell"
      equivalent={
        groups.length === 0 ? (
          <p className="text-muted-foreground">No cells.</p>
        ) : (
          <TableRegion label="Environment cells table">
            <Table>
              <TableCaption className="sr-only">
                Each environment cell, its platform and what it changes.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Cell</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>What it changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.flatMap((group) =>
                  group.cells.map((cell) => (
                    <TableRow key={`${group.platform}:${cell.cell}`}>
                      <TableCell className="font-mono text-xs">{cell.cell}</TableCell>
                      <TableCell className="font-mono text-xs">{cell.platform}</TableCell>
                      <TableCell className="text-xs">{cell.description}</TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </TableRegion>
        )
      }
    />
  )
}
