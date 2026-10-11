import { Fragment, type ReactNode } from "react"

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
import { ARM_GROUPS, type ArmGroup } from "@/content/d2/vocabulary"

import { ArmLabel } from "./arm-label"

export type ArmColumn = { key: string; label: string }

/** A cell's content and the words that stand for it in its accessible name. */
export type ArmCell = { node: ReactNode; text: string } | null

/**
 * Arms down, grouped as upper bounds, conventional baselines and CWA arms, against any columns:
 * the frame every typed-block table shares. A null cell is a dash named "not measured"; every
 * other cell carries its words as its accessible name and title, so nothing is read from the
 * layout alone.
 */
export function GroupedArmTable({
  label,
  caption,
  arms,
  columns,
  cell,
  showPayload = false,
}: {
  label: string
  caption: string
  arms: readonly { id: string; group: ArmGroup }[]
  columns: readonly ArmColumn[]
  cell: (arm: string, column: string) => ArmCell
  showPayload?: boolean
}) {
  const groups = ARM_GROUPS.map((group) => ({
    ...group,
    arms: arms.filter((arm) => arm.group === group.id),
  })).filter((group) => group.arms.length > 0)
  return (
    <TableRegion label={label}>
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Arm</TableHead>
            {columns.map((column) => (
              <TableHead key={column.key} scope="col" className="text-right">
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <Fragment key={group.id}>
              <TableRow className="border-t-2 hover:bg-transparent">
                <TableCell
                  colSpan={columns.length + 1}
                  scope="rowgroup"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {group.label}
                </TableCell>
              </TableRow>
              {group.arms.map((arm) => (
                <TableRow key={arm.id} data-arm={arm.id}>
                  <TableCell scope="row" className="align-top">
                    <ArmLabel arm={arm.id} showPayload={showPayload} />
                  </TableCell>
                  {columns.map((column) => {
                    const value = cell(arm.id, column.key)
                    const name = `${arm.id}, ${column.label}: ${value ? value.text : "not measured"}`
                    return (
                      <TableCell
                        key={column.key}
                        className="tabular text-right align-top"
                        aria-label={name}
                        title={name}
                      >
                        {value ? value.node : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </TableRegion>
  )
}

/** A share with its fraction beneath: 91.9% over 364 / 396. */
export function ShareCell({
  percent,
  fraction,
}: {
  percent: string | null
  fraction: string
}): ReactNode {
  return (
    <span className="inline-flex flex-col items-end">
      <span>{percent ?? <span className="text-muted-foreground">none</span>}</span>
      <span className="text-xs font-light text-muted-foreground">{fraction}</span>
    </span>
  )
}
