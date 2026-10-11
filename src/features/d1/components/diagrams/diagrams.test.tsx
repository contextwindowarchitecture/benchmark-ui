import { fireEvent, render, screen, within } from "@testing-library/react"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

import type { DocumentByKind, SchemaKind } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"
import { planeGroups } from "@/features/d1/model/contract"
import { environmentCells } from "@/features/d1/model/environment"
import { FIXTURE_RUNS, FIXTURES_DIR } from "@/test/fixture-fetch"

import { EnvironmentDiagram } from "./environment-diagram"
import { environmentLayout } from "./environment-geometry"
import { ModelDiagram } from "./model-diagram"
import { modelLayout } from "./model-geometry"
import { OraclesDiagram } from "./oracles-diagram"
import { ANSWER, BOX_HEIGHT, oraclesLayout } from "./oracles-geometry"
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

describe("the diagrams on a narrow screen", () => {
  it("keep the platforms side by side on a desktop frame and band them on a phone", async () => {
    const s2 = await document("suites/S2/summary.json", "suite-summary")
    const groups = environmentCells(s2.cells ?? [])
    const unmeasured = environmentLayout(groups, 0)
    expect(unmeasured.columns.map((column) => column.y)).toEqual([1, 1, 1])
    expect(unmeasured.width).toBe(562)
    // A frame a little narrower than three columns shrinks the picture rather than banding it.
    expect(environmentLayout(groups, 547)).toEqual(unmeasured)
    // A 375 px phone's frame holds one platform per band, at full size.
    const phone = environmentLayout(groups, 311)
    expect(phone.width).toBeLessThanOrEqual(311)
    expect(phone.columns.map((column) => column.x)).toEqual([1, 1, 1])
    const tops = phone.columns.map((column) => column.y)
    expect(tops).toEqual([...tops].sort((a, b) => a - b))
    expect(new Set(tops).size).toBe(3)
    // A wider phone holds two, shrunk by no more than 15%.
    const wider = environmentLayout(groups, 330)
    expect(wider.columns.map((column) => column.y)).toEqual([1, 1, wider.columns[2]!.y])
    expect(wider.width * 0.85).toBeLessThanOrEqual(330)
  })

  it("keep the four planes side by side on a laptop and pair them on a phone", async () => {
    const contract = await document("contract.json", "contract")
    const slots = planeGroups(contract).map((group) => group.slots.length)
    expect(slots).toEqual([4, 2, 2, 3])
    const unmeasured = modelLayout(slots, 0)
    expect(unmeasured).toMatchObject({ width: 758, height: 252, banded: false })
    expect(unmeasured.columns.map((column) => column.y)).toEqual([1, 1, 1, 1])
    // A 1280 px laptop's frame (547 px) still holds all four, shrunk.
    expect(modelLayout(slots, 547)).toEqual(unmeasured)
    // Room for three goes two and two rather than three and one.
    const three = modelLayout(slots, 450)
    expect(three.columns.map((column) => column.x)).toEqual([1, 193, 1, 193])
    // A 375 px phone's frame pairs them, each band as tall as its fullest plane.
    const phone = modelLayout(slots, 311)
    expect(phone).toMatchObject({ width: 374, banded: true })
    expect(phone.width * 0.7).toBeLessThanOrEqual(311)
    expect(phone.columns.map((column) => [column.x, column.y, column.height])).toEqual([
      [1, 1, 250],
      [193, 1, 250],
      [1, 265, 202],
      [193, 265, 202],
    ])
    expect(phone.height).toBe(468)
    // A 320 px phone's frame takes them one under another, at full size.
    const narrow = modelLayout(slots, 256)
    expect(narrow.width).toBeLessThanOrEqual(256)
    expect(narrow.columns.map((column) => column.x)).toEqual([1, 1, 1, 1])
  })

  it("draw the planes in bands when the frame measures a phone's width", async () => {
    const contract = await document("contract.json", "contract")
    const measure = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ width: 311 } as DOMRect)
    try {
      render(<ModelDiagram contract={contract} runId={FIXTURE_RUNS.nightly} />)
      const figure = screen.getByRole("figure", { name: /The model: four planes/ })
      expect(figure.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 374 468")
      expect(figure.querySelector('[data-plane="evidence"]')?.getAttribute("transform")).toBe(
        "translate(1,265)",
      )
      expect(figure.querySelectorAll("[data-slot]")).toHaveLength(11)
    } finally {
      measure.mockRestore()
    }
  })

  it("stack the oracles on a spine from the answer where the radial picture would not read", () => {
    expect(oraclesLayout(0).kind).toBe("radial")
    expect(oraclesLayout(547)).toEqual(oraclesLayout(0))
    const phone = oraclesLayout(311)
    expect(phone.kind).toBe("stack")
    expect(phone.width).toBe(311)
    const boxes = Object.values(phone.boxes)
    expect(boxes.every((box) => box.x + phone.boxWidth <= phone.width)).toBe(true)
    expect(boxes[0]!.y).toBeGreaterThan(phone.answer.y + ANSWER.h)
    boxes.slice(1).forEach((box, index) => {
      expect(box.y).toBeGreaterThanOrEqual(boxes[index]!.y + BOX_HEIGHT)
    })
    expect(boxes.at(-1)!.y + BOX_HEIGHT).toBeLessThanOrEqual(phone.height)
    // Narrower than a box's words, the stack keeps its size and the picture scales to the frame.
    expect(oraclesLayout(256).width).toBeGreaterThan(256)
  })

  it("draw the stack when the frame measures a phone's width", async () => {
    const summary = await document("summary.json", "summary")
    const measure = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ width: 311 } as DOMRect)
    try {
      render(<OraclesDiagram metrics={summary.metrics} runId={FIXTURE_RUNS.nightly} />)
      const figure = screen.getByRole("figure", { name: /four judges of one answer/ })
      const svg = figure.querySelector("svg")!
      expect(svg.dataset["layout"]).toBe("stack")
      expect(svg.getAttribute("viewBox")).toBe(`0 0 311 ${oraclesLayout(311).height}`)
      expect(figure.querySelectorAll("[data-oracle]")).toHaveLength(4)
    } finally {
      measure.mockRestore()
    }
  })
})
