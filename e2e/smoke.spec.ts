// One smoke test over the fixtures: the shell, the runs list and a run page render from the
// production build, and axe finds nothing on them.

import { AxeBuilder } from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const NIGHTLY = "20261012T084246Z-c5ce648"
const FAILING = "20261008T004213Z-e824f1b"
const D2_NIGHTLY = "20261012T135118Z-f2fee09"
const S7 = "20261012T154357Z-a6bbb5b"
const SWEEP = "1da5d58f5c90cbd75466c9f99c29167a46109c483d924b4f5cc56b75994ba1a3"

// The preview server sends the production Content Security Policy; a violation is a console error
// in Chromium, and one anywhere on these pages fails the test.
test.beforeEach(({ page }) => {
  const violations: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      violations.push(message.text())
    }
  })
  page.on("pageerror", (error) => violations.push(error.message))
  cspViolations.set(page, violations)
})

test.afterEach(({ page }) => {
  expect(cspViolations.get(page) ?? [], "console errors on the page").toEqual([])
})

const cspViolations = new WeakMap<Page, string[]>()

// axe judges contrast from the colours it reads at that moment, so a control still fading in
// (the runs list's Refresh button re-enabling after its refetch) would be judged half drawn. It
// runs once every finite animation and transition has finished; spinners and skeletons loop.
async function expectAccessible(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== "running" ||
          animation.effect?.getTiming().iterations === Infinity,
      ),
  )
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
}

test("the home page, the runs list and a run page render from the fixtures", async ({ page }) => {
  const response = await page.goto("/")
  expect(response?.headers()["content-security-policy"]).toContain("script-src 'self';")
  await expect(page).toHaveTitle("CWA benchmark")
  await expect(page.getByRole("link", { name: "Skip to content" })).toHaveCount(1)
  await expect(page.getByRole("main")).toHaveCount(1)
  await expect(page.getByRole("link", { name: NIGHTLY }).first()).toBeVisible()
  await expect(page.getByRole("figure", { name: /The model: four planes/ })).toBeVisible()
  await expect(page.getByText("11 of 11 suites pass")).toBeVisible()
  await expectNoOverflow(page)
  await expectAccessible(page)

  await page.getByRole("link", { name: "Runs", exact: true }).first().click()
  await expect(page).toHaveTitle("Runs · CWA benchmark")
  await expect(page.getByText("3 runs")).toBeVisible()
  await expect(page.locator("tbody tr")).toHaveCount(3)
  await expect(page.locator(`tr[data-run="${NIGHTLY}"]`).getByText("baseline")).toBeVisible()
  await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled()
  await expectAccessible(page)

  await page.locator(`tr[data-run="${NIGHTLY}"]`).getByRole("link", { name: NIGHTLY }).click()
  await expect(page).toHaveTitle(`Run · ${NIGHTLY} · CWA benchmark`)
  await expect(page.getByRole("heading", { level: 1, name: NIGHTLY })).toBeFocused()
  await expect(page.getByText("cwa-bench-d1 0.1.0 · Python 3.14.4")).toBeVisible()
  await expect(page.getByRole("link", { name: /^S1 python: pass, 65 \/ 65 cases/ })).toBeVisible()
  await expect(page.getByText("No findings in this run")).toBeVisible()
  await expect(page.getByRole("link", { name: "Download summary.json" })).toHaveAttribute(
    "href",
    `/results/d1/${NIGHTLY}/summary.json`,
  )
  await expectNoOverflow(page)
  await expectAccessible(page)

  // A suite page from a matrix cell, with its rows loaded on request.
  await page.getByRole("link", { name: /^S1 python: pass, 65 \/ 65 cases/ }).click()
  await expect(page).toHaveTitle(`S1 · ${NIGHTLY} · CWA benchmark`)
  await expect(
    page.getByRole("heading", { level: 1, name: "S1 · Conformance replay" }),
  ).toBeFocused()
  await expect(page.getByText("Differential agreement · 90 of 90 cases")).toBeVisible()
  await expect(page.getByRole("region", { name: "Conformance cases table" })).toBeVisible()
  // The address carried the adapter filter, so the rows opened at once.
  await expect(page.getByRole("region", { name: "S1 rows table" })).toBeVisible()
  await expect(page.getByRole("combobox", { name: "Filter rows by adapter" })).toContainText(
    "Python",
  )
  await expectNoOverflow(page)
  await expectAccessible(page)

  // A case from the conformance table opens in the answer explorer.
  await page
    .getByRole("region", { name: "Conformance cases table" })
    .getByRole("link", { name: "admission-reasons" })
    .click()
  await expect(page.getByRole("heading", { level: 1, name: "admission-reasons" })).toBeFocused()
  await expect(page.getByText("21 passed, none failed.").first()).toBeVisible()
  await expect(page.locator('[data-blob="ready"]').first()).toBeVisible()
  await expectNoOverflow(page)
  await expectAccessible(page)

  // Coverage: the three matrices.
  await page.goto(`/d1/runs/${NIGHTLY}/coverage`)
  await expect(page.getByRole("heading", { level: 1, name: "Coverage" })).toBeVisible()
  await expect(
    page.getByRole("region", { name: "Reasons by slot matrix for Python" }),
  ).toBeVisible()
  await expect(page.getByText("418 tags, every one exercised.")).toBeVisible()
  await expectNoOverflow(page)
  await expectAccessible(page)
})

test("the failing run's findings list and a finding render with the minimized draft", async ({
  page,
}) => {
  await page.goto(`/d1/runs/${FAILING}/findings`)
  await expect(page.getByText("19 rows")).toBeVisible()
  await expectAccessible(page)
  await page
    .getByRole("link", { name: /breaks MR4/ })
    .first()
    .click()
  await expect(page.getByRole("heading", { level: 1, name: /^Finding / })).toBeFocused()
  await expect(page.getByText("The rows that carry this finding")).toBeVisible()
  await expect(page.locator('[data-blob="ready"]').first()).toBeVisible()
  await expect(page.locator("[data-draft-file]").first()).toBeVisible()
  await expectNoOverflow(page)
  await expectAccessible(page)
})

/**
 * The page never overflows horizontally (DESIGN.md 4.2), and nothing spills out of a table cell over
 * the next one: the generated cells do not wrap, so long words need a cell that does.
 */
async function expectNoOverflow(page: Page) {
  const widths = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ])
  expect(widths[0]).toBeLessThanOrEqual(widths[1]!)
  const spilled = await page.evaluate(() =>
    [...document.querySelectorAll("main td, main th")].flatMap((cell) => {
      const edge = cell.getBoundingClientRect().right
      const over = [...cell.querySelectorAll("*")].find((el) => {
        const box = el.getBoundingClientRect()
        return !(el instanceof SVGElement) && box.width > 0 && box.right > edge + 2
      })
      return over
        ? [`${over.tagName.toLowerCase()} "${(over.textContent ?? "").slice(0, 40)}"`]
        : []
    }),
  )
  expect(spilled, "content spilling out of a table cell").toEqual([])
}

test("a run the server no longer holds is shown as pruned, not as a 404", async ({ page }) => {
  await page.route("**/results/d1/20261008T004213Z-e824f1b/index.json", (route) =>
    route.fulfill({ status: 404 }),
  )
  await page.goto("/d1/runs")
  await expect(
    page.locator('tr[data-run="20261008T004213Z-e824f1b"]').getByText("pruned"),
  ).toBeVisible()
  await page.goto("/d1/runs/20261008T004213Z-e824f1b")
  await expect(page.getByText("Run 20261008T004213Z-e824f1b is not on the server")).toBeVisible()
  await expectAccessible(page)
})

test("the Domain 1 overview, About, a domain page and compare render", async ({ page }) => {
  await page.goto("/d1")
  await expect(page).toHaveTitle("Domain 1 overview · CWA benchmark")
  await expect(page.getByText("16de4be").first()).toBeVisible()
  await expect(page.locator('[data-metric="s7.agreement"]')).toBeVisible()
  await expect(page.getByRole("img", { name: /Shedding curve of compressible-v0/ })).toBeVisible()
  // The reveal ran once; the flag is in session storage, so a reload draws without animating.
  await expect(page.locator('[data-reveal="done"]')).toBeVisible()
  await expect(page.locator("[data-walk]")).toBeVisible()
  await page.getByRole("button", { name: "Step back" }).click()
  await expect(page.locator('[data-walk-step="40"]')).toBeVisible()
  await expect(page.getByRole("region", { name: "Suite by adapter matrix" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Pressure exponents table" })).toBeVisible()
  await expect(page.getByRole("figure", { name: /four judges of one answer/ })).toBeVisible()
  await expect(page.getByText("34 findings in the S7 run")).toBeVisible()
  await expect(page.locator("[data-development-run]")).toContainText(
    "A development-time record, not a reported result",
  )
  await expectNoOverflow(page)
  await expectAccessible(page)

  await page.goto("/about")
  await expect(page.getByRole("region", { name: "Schema kinds table" })).toBeVisible()
  await expectAccessible(page)

  await page.goto("/d5")
  await expect(
    page.getByRole("heading", { level: 1, name: /Domain 5 · Instruction hierarchy/ }),
  ).toBeVisible()
  await expect(page.getByRole("main").getByText("not started", { exact: true })).toBeVisible()
  await expectAccessible(page)

  await page.goto(`/d1/compare?from=${FAILING}&to=${NIGHTLY}`)
  await expect(page.getByText("Computed by this viewer, not by the harness")).toBeVisible()
  await expect(page.getByRole("region", { name: "Metrics that moved table" })).toBeVisible()
  await expectNoOverflow(page)
  await expectAccessible(page)
})

test("the home page, the Domain 1 overview, S2 and coverage fit a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")
  await expect(page.getByRole("figure", { name: /The model: four planes/ })).toBeVisible()
  await expectFitsThePhone(page)

  await page.goto("/d1")
  await expect(page.locator("[data-walk]")).toBeVisible()
  await expect(page.getByRole("figure", { name: /what S2 changes/ })).toBeVisible()
  await expect(page.getByRole("figure", { name: /four judges of one answer/ })).toBeVisible()
  await expect(page.locator('#oracles-diagram svg[data-layout="stack"]')).toBeVisible()
  await expectFitsThePhone(page)

  await page.goto(`/d1/runs/${NIGHTLY}/suites/S2`)
  await expect(
    page.locator("#panel").getByRole("region", { name: "Environment matrix" }),
  ).toBeVisible()
  await expectFitsThePhone(page)

  await page.goto(`/d1/runs/${NIGHTLY}/coverage`)
  await expect(page.getByRole("region", { name: "Tags matrix" })).toBeVisible()
  await expectFitsThePhone(page)
})

test("Domain 2's overview, a run page and a suite page with its rows fit a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/d2")
  await expect(
    page.getByRole("img", { name: /^Correct answers per arm at 8,192 tokens/ }),
  ).toBeVisible()
  await expect(page.locator("[data-chart=tier-lines] [data-panel=cwa-ranked]")).toBeVisible()
  await expectFitsThePhone(page)

  await page.goto(`/d2/runs/${D2_NIGHTLY}`)
  await expect(page.getByText("459 metrics")).toBeVisible()
  await expectFitsThePhone(page)

  await page.goto(`/d2/runs/${D2_NIGHTLY}/suites/S2`)
  await expect(page.getByRole("region", { name: "Correct answers by arm and tier" })).toBeVisible()
  await page.getByRole("button", { name: "Load the rows" }).click()
  await expect(page.getByText("12 rows")).toBeVisible()
  await expectFitsThePhone(page)
})

// At a phone's width (DESIGN.md 4.2) the page never scrolls sideways, and nothing outside a
// labelled table region reaches past the screen's edge, not even inside a picture's frame.
async function expectFitsThePhone(page: Page) {
  await expectNoOverflow(page)
  const past = await page.evaluate(() => {
    const edge = document.documentElement.clientWidth
    return [...document.querySelectorAll("main *")]
      .filter((el) => el.getBoundingClientRect().right > edge + 0.5 && !el.closest("[role=region]"))
      .map((el) => `${el.tagName.toLowerCase()} ${el.getAttribute("class") ?? ""}`.trim())
  })
  expect(past, "elements past the screen's edge").toEqual([])
}

test("the overview respects reduced motion: no playback, the final state shown", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/d1")
  await expect(page.locator("[data-walk]")).toBeVisible()
  await expect(page.getByRole("button", { name: "Play" })).toHaveCount(0)
  await expect(page.locator('[data-walk-step="41"]')).toBeVisible()
  await expect(page.getByRole("img", { name: /Shedding curve/ })).toBeVisible()
})

test("Domain 2's overview, runs, run page and a suite page render from its fixture", async ({
  page,
}) => {
  await page.goto("/d2")
  await expect(page).toHaveTitle("Domain 2 overview · CWA benchmark")
  await expect(page.getByRole("region", { name: "Runs read" })).toBeVisible()
  await expect(
    page.getByRole("img", { name: /^Correct answers per arm at 8,192 tokens/ }),
  ).toBeVisible()
  await expect(
    page.getByRole("img", { name: /^Prompt tokens per correct answer at 8,192 tokens/ }),
  ).toBeVisible()
  await expect(page.locator("[data-chart=tier-lines] [data-panel=cwa-ranked]")).toBeVisible()
  await expect(page.locator('[data-metric="s1.agreement"]')).toBeVisible()
  await expectNoOverflow(page)
  await expectAccessible(page)

  await page.getByRole("link", { name: "Runs", exact: true }).nth(1).click()
  await expect(page).toHaveURL(/\/d2\/runs$/)
  await expect(page.locator(`tr[data-run="${D2_NIGHTLY}"]`).getByText("baseline")).toBeVisible()
  await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled()
  await expectAccessible(page)

  await page.locator(`tr[data-run="${D2_NIGHTLY}"]`).getByRole("link", { name: D2_NIGHTLY }).click()
  await expect(page.getByRole("heading", { level: 1, name: D2_NIGHTLY })).toBeFocused()
  await expect(page.getByText("459 metrics")).toBeVisible()
  await expect(page.getByRole("link", { name: "Download summary.json" })).toHaveAttribute(
    "href",
    `/results/d2/${D2_NIGHTLY}/summary.json`,
  )
  await expectNoOverflow(page)
  await expectAccessible(page)

  await page.getByRole("link", { name: /S2 · Scripted conversations/ }).click()
  await expect(
    page.getByRole("heading", { level: 1, name: "S2 · Scripted conversations" }),
  ).toBeFocused()
  await expect(page.getByRole("region", { name: "Correct answers by arm and tier" })).toBeVisible()
  await page.getByRole("button", { name: "Load the rows" }).click()
  await expect(page.getByText("12 rows")).toBeVisible()
  await expectNoOverflow(page)
  await expectAccessible(page)
})

test("S7's sweeps, the shedding viewer playing, the grid and performance render", async ({
  page,
}) => {
  await page.goto(`/d1/runs/${S7}/sweeps`)
  await expect(page.getByRole("heading", { level: 1, name: "Shedding" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Sweeps table" }).locator("tbody tr")).toHaveCount(
    8,
  )
  await expectNoOverflow(page)
  await expectAccessible(page)

  await page.getByRole("link", { name: "compressible-v0" }).click()
  await expect(
    page.getByRole("heading", { level: 1, name: "Shedding · compressible-v0" }),
  ).toBeFocused()
  const viewer = page.locator("[data-viewer]")
  await expect(viewer).toHaveAttribute("data-frame", "0")
  await expect(page.getByRole("img", { name: /Items kept at each budget/ })).toBeVisible()
  // Playing moves through the recorded frames at 12 a second, and the address follows.
  await page.getByRole("button", { name: "Play" }).click()
  await expect(viewer).not.toHaveAttribute("data-frame", "0")
  await expect(viewer).toHaveAttribute("data-frame", "15", { timeout: 5_000 })
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible()
  await expect(page).toHaveURL(/\?frame=15$/)
  // The keyboard: arrows step on the slider, space plays and pauses.
  const slider = page.getByRole("slider", { name: "Frame" })
  await slider.focus()
  await page.keyboard.press("Home")
  await expect(viewer).toHaveAttribute("data-frame", "0")
  await page.keyboard.press("ArrowRight")
  await expect(viewer).toHaveAttribute("data-frame", "1")
  await page.keyboard.press(" ")
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible()
  await page.keyboard.press(" ")
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible()
  await page.getByRole("button", { name: "Lanes" }).click()
  await expect(page.locator('[data-state="no-timeline"]')).toBeVisible()
  await expectNoOverflow(page)
  await expectAccessible(page)

  await page.goto(`/d1/runs/${S7}/suites/S7`)
  await page.getByRole("button", { name: "Draw the grid" }).click()
  await expect(page.getByRole("region", { name: "Scale grid" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Threshold searches table" })).toBeVisible()
  await expectNoOverflow(page)
  await expectAccessible(page)

  await page.goto(`/d1/runs/${S7}/perf`)
  await expect(page.getByRole("heading", { level: 2, name: "Scaling" })).toBeVisible()
  await expect(page.locator("[data-fit-line]")).toHaveCount(4)
  await expect(page.getByRole("region", { name: "Startup table" })).toBeVisible()
  await expectNoOverflow(page)
  await expectAccessible(page)
})

test("the shedding viewer and performance fit a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`/d1/runs/${S7}/sweeps/${SWEEP}`)
  await expect(page.getByRole("img", { name: /Shedding curve of compressible-v0/ })).toBeVisible()
  await expect(page.getByRole("img", { name: /Items kept at each budget/ })).toBeHidden()
  await expectFitsThePhone(page)
  await page.getByRole("button", { name: "Items" }).click()
  await expect(page.getByRole("img", { name: /Items kept at each budget/ })).toBeVisible()
  await expect(page.getByRole("img", { name: /Shedding curve of compressible-v0/ })).toBeHidden()
  await expectFitsThePhone(page)

  await page.goto(`/d1/runs/${S7}/sweeps`)
  await expect(page.getByRole("region", { name: "Sweeps table" })).toBeVisible()
  await expectFitsThePhone(page)

  await page.goto(`/d1/runs/${S7}/perf`)
  await expect(page.locator("[data-fit-line]")).toHaveCount(4)
  await expectFitsThePhone(page)
})

test("the shedding viewer respects reduced motion: no playback, the last frame first", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(`/d1/runs/${S7}/sweeps/${SWEEP}`)
  await expect(page.locator("[data-viewer]")).toHaveAttribute("data-frame", "15")
  await expect(page.getByRole("button", { name: "Play" })).toHaveCount(0)
  await page.getByRole("button", { name: "To the first frame" }).click()
  await expect(page.locator("[data-viewer]")).toHaveAttribute("data-frame", "0")
})

test("the glossary, a missing page and the viewer's items pass axe", async ({ page }) => {
  await page.goto("/glossary")
  await expect(page.getByRole("heading", { level: 1, name: "Glossary" })).toBeVisible()
  await expectAccessible(page)

  await page.goto("/d1/nowhere")
  await expect(page.getByText("Page not found")).toBeVisible()
  await expectAccessible(page)

  await page.goto(`/d1/runs/${S7}/sweeps/${SWEEP}?frame=3`)
  await expect(page.getByRole("img", { name: /Items kept at each budget/ })).toBeVisible()
  await expectAccessible(page)
})

// The dark theme (DESIGN.md 10): a page of each kind under axe, the theme following the system's.
test("a page of each kind passes axe in the dark theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  const pages: [string, () => Promise<void>][] = [
    ["/", () => expect(page.getByText("11 of 11 suites pass")).toBeVisible()],
    ["/d1", () => expect(page.getByRole("img", { name: /Shedding curve/ })).toBeVisible()],
    [`/d1/runs/${NIGHTLY}`, () => expect(page.getByText("No findings in this run")).toBeVisible()],
    [
      `/d1/runs/${NIGHTLY}/suites/S2`,
      () => expect(page.getByRole("region", { name: "Environment matrix" }).first()).toBeVisible(),
    ],
    [
      `/d1/runs/${NIGHTLY}/coverage`,
      () => expect(page.getByText("418 tags, every one exercised.")).toBeVisible(),
    ],
    [`/d1/runs/${FAILING}/findings`, () => expect(page.getByText("19 rows")).toBeVisible()],
    [
      `/d1/runs/${S7}/sweeps/${SWEEP}?frame=3`,
      () => expect(page.getByRole("img", { name: /Items kept at each budget/ })).toBeVisible(),
    ],
    [`/d1/runs/${S7}/perf`, () => expect(page.locator("[data-fit-line]")).toHaveCount(4)],
    [
      `/d1/compare?from=${FAILING}&to=${NIGHTLY}`,
      () => expect(page.getByRole("region", { name: "Metrics that moved table" })).toBeVisible(),
    ],
    [
      "/d2",
      () =>
        expect(
          page.getByRole("img", { name: /^Correct answers per arm at 8,192 tokens/ }),
        ).toBeVisible(),
    ],
    [
      `/d2/runs/${D2_NIGHTLY}/suites/S2`,
      () =>
        expect(page.getByRole("region", { name: "Correct answers by arm and tier" })).toBeVisible(),
    ],
  ]
  for (const [path, ready] of pages) {
    await page.goto(path)
    await expect(page.locator("html")).toHaveClass(/dark/)
    await ready()
    await expectAccessible(page)
  }
})

// Reflow (WCAG 1.4.10): at 320 px, what 400% zoom of a 1280 px screen leaves, nothing scrolls sideways
// outside a table region.
test("the densest pages reflow at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const pages: [string, () => Promise<void>][] = [
    ["/", () => expect(page.getByText("11 of 11 suites pass")).toBeVisible()],
    ["/d1", () => expect(page.getByRole("img", { name: /Shedding curve/ })).toBeVisible()],
    [`/d1/runs/${NIGHTLY}`, () => expect(page.getByText("No findings in this run")).toBeVisible()],
    [
      `/d1/runs/${S7}/sweeps/${SWEEP}`,
      () => expect(page.getByRole("img", { name: /Shedding curve/ })).toBeVisible(),
    ],
    [`/d1/runs/${S7}/perf`, () => expect(page.locator("[data-fit-line]")).toHaveCount(4)],
    [
      "/d2",
      () =>
        expect(
          page.getByRole("img", { name: /^Correct answers per arm at 8,192 tokens/ }),
        ).toBeVisible(),
    ],
  ]
  for (const [path, ready] of pages) {
    await page.goto(path)
    await ready()
    await expectFitsThePhone(page)
  }
})

// The keyboard alone (DESIGN.md 10): a matrix's scroll region takes the focus and scrolls with the
// arrows, and the run picker opens, moves and chooses, landing focus on the new page's title.
test("the keyboard scrolls a matrix and works the run picker", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await page.goto(`/d1/runs/${NIGHTLY}/coverage`)
  const matrix = page.getByRole("region", { name: "Reasons by slot matrix for Python" })
  await expect(matrix).toBeVisible()
  await matrix.focus()
  await expect(matrix).toBeFocused()
  const before = await matrix.evaluate((node) => node.scrollLeft)
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("ArrowRight")
  await expect.poll(() => matrix.evaluate((node) => node.scrollLeft)).toBeGreaterThan(before)

  // From the S7 run, whose profile (none) the failing run shares, to the other run by the arrows.
  await page.goto(`/d1/runs/${S7}/coverage`)
  await expect(page.getByRole("heading", { level: 1, name: "Coverage" })).toBeVisible()
  const picker = page.getByRole("combobox", { name: "Run" })
  await picker.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("option", { name: new RegExp(FAILING) })).toBeVisible()
  // A person's pace between the keys: Radix's select ignores a choice made the instant it opens.
  await page.waitForTimeout(300)
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(new RegExp(`/d1/runs/${FAILING}/coverage$`))
  await expect(page.getByRole("heading", { level: 1, name: "Coverage" })).toBeFocused()
})

// The shell's preferences and focus (DESIGN.md 4.2, 10): the desktop sidebar's collapse is kept
// across a reload, and on a phone the navigation sheet closes on Escape and gives the focus back to
// the button that opened it.
test("the sidebar keeps its collapse, and the phone's sheet returns the focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/about")
  const sidebar = page.locator('[data-slot="sidebar"][data-state]').first()
  await expect(sidebar).toHaveAttribute("data-state", "expanded")
  await page.getByRole("button", { name: "Toggle Sidebar" }).first().click()
  await expect(sidebar).toHaveAttribute("data-state", "collapsed")
  await page.reload()
  await expect(page.locator('[data-slot="sidebar"][data-state]').first()).toHaveAttribute(
    "data-state",
    "collapsed",
  )

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/about")
  const trigger = page.getByRole("button", { name: "Toggle Sidebar" }).first()
  await trigger.click()
  const sheet = page.getByRole("dialog")
  await expect(sheet).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(sheet).toBeHidden()
  await expect(trigger).toBeFocused()
  // A link in the sheet changes the route: the focus goes to the new page's title, not back.
  await trigger.click()
  await page.getByRole("dialog").getByRole("link", { name: "Glossary" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Glossary" })).toBeFocused()
})
