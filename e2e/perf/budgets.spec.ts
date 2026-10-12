// The profile's rendering and interaction budgets, measured in Chromium over the production build. Each
// time is taken in the page (performance.now(), from the navigation's start or from the action), so the
// test runner's own latency is not in it. Every measurement is printed, met or not.

import { expect, test, type Page } from "@playwright/test"

const NIGHTLY_FIXTURE = "20261012T084246Z-c5ce648"
const S7_RUN = "20261012T090317Z-c5ce648"
/** The real run's largest sweep (compressible-v3, 737 frames per adapter, 20 MB). */
const LARGE_SWEEP = "f0886121fc90a2680d9e5f5bf4c9030f20a5db3551177755ca6f4e93ea416682"

const BUDGET = {
  overviewFirstRenderMs: 1_000,
  homeFirstRenderMs: 1_000,
  viewerFirstFrameMs: 2_000,
  viewerStepMs: 100,
  viewerMainHeapMb: 64,
  routeChangeMs: 500,
}

function report(what: string, value: number, budget: number, unit: string) {
  console.log(`${what}: ${value.toFixed(unit === "MB" ? 1 : 0)} ${unit} (budget ${budget} ${unit})`)
}

/** The time since the navigation started at which a selector first matches a visible element. */
async function timeTo(page: Page, selector: string): Promise<number> {
  const handle = await page.waitForFunction(
    (sel) => {
      const node = document.querySelector(sel)
      return node && (node as HTMLElement).getClientRects().length > 0 ? performance.now() : null
    },
    selector,
    { polling: "raf", timeout: 15_000 },
  )
  return (await handle.jsonValue()) as number
}

/** Whether the server holds the real S7 run and its largest sweep, not only the fixtures. */
async function hasRealSweep(page: Page): Promise<boolean> {
  const response = await page.request.head(
    `/results/d1/${S7_RUN}/suites/S7/sweeps/${LARGE_SWEEP}.json`,
  )
  return response.ok()
}

// The overview reads each of its runs' findings.jsonl (tens of rows) for the counts by severity, which
// the summary does not carry; no other row file.
const isRunFindings = (url: string) => /\/results\/d1\/[^/]+\/findings\.jsonl$/.test(url)

test("the home page and the Domain 1 overview render within a second, with no row file", async ({
  page,
}) => {
  const rowFiles: string[] = []
  page.on("request", (request) => {
    if (request.url().endsWith(".jsonl") && !isRunFindings(request.url()))
      rowFiles.push(request.url())
  })
  await page.goto("/", { waitUntil: "commit" })
  const home = await page
    .waitForFunction(
      () =>
        /suites pass/.test(document.querySelector('[data-domain="d1"]')?.textContent ?? "")
          ? performance.now()
          : null,
      undefined,
      { polling: "raf", timeout: 15_000 },
    )
    .then((handle) => handle.jsonValue() as Promise<number>)
  report("home, Domain 1's headline", home, BUDGET.homeFirstRenderMs, "ms")
  expect(home).toBeLessThan(BUDGET.homeFirstRenderMs)

  await page.goto("/d1", { waitUntil: "commit" })
  const overview = await timeTo(page, "[data-headline-group] [data-metric]")
  report("Domain 1 overview, headline cards", overview, BUDGET.overviewFirstRenderMs, "ms")
  expect(overview).toBeLessThan(BUDGET.overviewFirstRenderMs)
  await expect(page.getByRole("img", { name: /Shedding curve/ })).toBeVisible()
  expect(rowFiles, "row files the overview requested").toEqual([])
})

test("a route change from a run page to a suite page lands within half a second", async ({
  page,
}) => {
  await page.goto(`/d1/runs/${NIGHTLY_FIXTURE}`)
  const cell = page.getByRole("link", { name: /^S1 python: / })
  await expect(cell, `run ${NIGHTLY_FIXTURE}'s S1 cell`).toBeVisible()
  const start = await page.evaluate(() => performance.now())
  await cell.click()
  const landed = await page
    .waitForFunction(
      () =>
        /^S1 · /.test(document.querySelector("h1")?.textContent ?? "") &&
        document.querySelector("#panel")
          ? performance.now()
          : null,
      undefined,
      { polling: "raf", timeout: 15_000 },
    )
    .then((handle) => handle.jsonValue() as Promise<number>)
  const took = landed - start
  report("run page to S1's suite page", took, BUDGET.routeChangeMs, "ms")
  expect(took).toBeLessThan(BUDGET.routeChangeMs)
})

test("the viewer's first frame from the 20 MB sweep, a step, and the main thread's heap", async ({
  page,
}) => {
  test.skip(!(await hasRealSweep(page)), "the real S7 run's 20 MB sweep is not on this server")
  await page.goto(`/d1/runs/${S7_RUN}/sweeps/${LARGE_SWEEP}`, { waitUntil: "commit" })
  const first = await timeTo(page, '[data-viewer] [data-chart="shedding-curve"] path')
  report("viewer, first frame of the 20 MB sweep", first, BUDGET.viewerFirstFrameMs, "ms")
  expect(first).toBeLessThan(BUDGET.viewerFirstFrameMs)
  await expect(page.getByRole("img", { name: /Items kept at each budget/ })).toBeVisible()

  // A step: from the click to the frame after the counters changed.
  const step = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const viewer = document.querySelector("[data-viewer]") as HTMLElement
        const button = document.querySelector<HTMLButtonElement>(
          'button[aria-label="Step forward"]',
        )
        const before = viewer.getAttribute("data-frame")
        const started = performance.now()
        const observer = new MutationObserver(() => {
          if (viewer.getAttribute("data-frame") === before) return
          observer.disconnect()
          requestAnimationFrame(() => resolve(performance.now() - started))
        })
        observer.observe(viewer, { attributes: true })
        button?.click()
      }),
  )
  report("viewer, a step to the next frame", step, BUDGET.viewerStepMs, "ms")
  expect(step).toBeLessThan(BUDGET.viewerStepMs)

  // The frames stay in the worker: the page's own heap, after a collection.
  const session = await page.context().newCDPSession(page)
  await session.send("HeapProfiler.collectGarbage")
  const { usedSize } = (await session.send("Runtime.getHeapUsage")) as { usedSize: number }
  const heap = usedSize / (1024 * 1024)
  report("viewer, main thread heap", heap, BUDGET.viewerMainHeapMb, "MB")
  expect(heap).toBeLessThan(BUDGET.viewerMainHeapMb)
})
