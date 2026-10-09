import { fireEvent, render, screen, within } from "@testing-library/react"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import type { DocumentByKind, SchemaKind } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { planeGroups } from "@/features/d1/model/contract"
import { environmentCells } from "@/features/d1/model/environment"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import { EnvironmentDiagram } from "./environment-diagram"
import { ModelDiagram } from "./model-diagram"
import { OraclesDiagram } from "./oracles-diagram"
import { PipelineDiagram } from "./pipeline-diagram"

async function document<K extends SchemaKind>(path: string, kind: K): Promise<DocumentByKind[K]> {
  const result = parseDocumentAs(
    JSON.parse(await readFile(join(FIXTURES_DIR, FIXTURE_RUNS.nightly, path), "utf8")),
    kind,
  )
  if (!result.ok) throw new Error(result.reason)
  return result.document
}

describe("the diagrams", () => {
  it("draw the model from the contract's slots, with the words beside and the picture hidden", async () => {
    const contract = await document("contract.json", "contract")
    const groups = planeGroups(contract)
    expect(groups.map((group) => [group.name, group.slots.length])).toEqual([
      ["Governance", 4],
      ["State", 2],
      ["Evidence", 2],
      ["Interaction", 3],
    ])
    render(<ModelDiagram contract={contract} runId={FIXTURE_RUNS.nightly} />)
    const figure = screen.getByRole("figure", { name: /The model: four planes, eleven slots/ })
    expect(figure.querySelector("svg")?.closest("[aria-hidden='true']")).not.toBeNull()
    expect(figure.querySelectorAll("[data-slot]")).toHaveLength(11)
    // Every slot's holds and rule are in the text equivalent.
    for (const slot of contract.slots) {
      expect(within(figure).getByText(slot.id)).toBeInTheDocument()
    }
    expect(within(figure).getAllByText(/never omitted/).length).toBeGreaterThan(0)
    // Hovering a slot shows its rule in the caption.
    fireEvent.mouseEnter(figure.querySelector('[data-slot="evidence.knowledge"]')!)
    expect(figure.querySelector("[data-slot-caption]")?.textContent).toContain("evidence.knowledge")
  })

  it("draws the pipeline's eight lanes with the specification's words", () => {
    render(<PipelineDiagram />)
    const figure = screen.getByRole("figure", { name: /The pipeline: eight stages/ })
    expect(figure.querySelectorAll("[data-lane]")).toHaveLength(8)
    expect(within(figure).getAllByRole("listitem")).toHaveLength(8)
    const renderLane = figure.querySelector('[data-lane-words="render"]') as HTMLElement
    expect(within(renderLane).getByText("Render & trace")).toBeInTheDocument()
    expect(within(figure).getByText(/Refuse before any reduction/)).toBeInTheDocument()
  })

  it("puts the self-check's numbers on the oracles that measure them", async () => {
    const summary = await document("summary.json", "summary")
    render(<OraclesDiagram metrics={summary.metrics} runId={FIXTURE_RUNS.nightly} />)
    const figure = screen.getByRole("figure", { name: /four judges of one answer/ })
    expect(figure.querySelectorAll("[data-oracle]")).toHaveLength(4)
    const auditor = figure.querySelector('[data-oracle-words="auditor"]')!
    expect(
      within(auditor as HTMLElement).getByText(/99\.4% \(1,616 \/ 1,626\)/),
    ).toBeInTheDocument()
    const expected = figure.querySelector('[data-oracle-words="expected"]')!
    expect((expected as HTMLElement).querySelectorAll("[data-metric]")).toHaveLength(5)
    const differential = figure.querySelector('[data-oracle-words="differential"]')!
    expect(
      within(differential as HTMLElement).getByText(/Judged on every answer/),
    ).toBeInTheDocument()
  })

  it("draws the environment cells grouped by platform, with every cell in the table", async () => {
    const s2 = await document("suites/S2/summary.json", "suite-summary")
    const groups = environmentCells(s2.cells ?? [])
    expect(groups.map((group) => group.platform)).toEqual([
      "darwin/arm64",
      "linux/arm64",
      "linux/amd64",
    ])
    expect(groups.flatMap((group) => group.cells)).toHaveLength(25)
    render(<EnvironmentDiagram cells={s2.cells ?? []} runId={FIXTURE_RUNS.nightly} />)
    const figure = screen.getByRole("figure", { name: /what S2 changes/ })
    expect(figure.querySelectorAll("[data-cell]")).toHaveLength(25)
    const table = within(figure).getByRole("region", { name: "Environment cells table" })
    expect(within(table).getAllByRole("row")).toHaveLength(26)
    expect(within(table).getByText("Wall clock 30 years earlier (libfaketime)")).toBeInTheDocument()
    fireEvent.mouseEnter(figure.querySelector('[data-cell="burst:32"]')!)
    expect(figure.querySelector("[data-cell-caption]")?.textContent).toContain("32 invocations")
  })

  it("says when there are no cells", () => {
    render(<EnvironmentDiagram cells={[]} runId="r" />)
    expect(screen.getByText("No cells were run.")).toBeInTheDocument()
  })
})
