// The distinct cells of an environment matrix (ui-plan.md 7.3), for the environment diagram:
// what each cell changes, grouped by platform, from a suite summary's typed `cells[]`.

import type { MatrixCell } from "./suite"

export type EnvironmentCell = { cell: string; platform: string; description: string }

export type EnvironmentGroup = { platform: string; cells: EnvironmentCell[] }

/** The distinct cells, grouped by platform in first-seen order, each with its description. */
export function environmentCells(cells: readonly MatrixCell[]): EnvironmentGroup[] {
  const groups = new Map<string, Map<string, EnvironmentCell>>()
  for (const cell of cells) {
    const group = groups.get(cell.platform) ?? new Map<string, EnvironmentCell>()
    if (!group.has(cell.cell)) {
      group.set(cell.cell, {
        cell: cell.cell,
        platform: cell.platform,
        description: cell.description,
      })
    }
    groups.set(cell.platform, group)
  }
  return [...groups.entries()].map(([platform, group]) => ({
    platform,
    cells: [...group.values()],
  }))
}
