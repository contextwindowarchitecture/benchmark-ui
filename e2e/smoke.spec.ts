// One smoke test over the fixtures: the shell, the runs list and a run page render from the
// production build, and axe finds nothing on them.

import { AxeBuilder } from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const NIGHTLY = "20261008T133453Z-691b414"
const FAILING = "20261008T004213Z-e824f1b"

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

async function expectAccessible(page: Page) {
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
  await expect(page.locator(`tr[data-run="${NIGHTLY}"]`).getByText("changed")).toBeVisible()
  await expectAccessible(page)

  await page.locator(`tr[data-run="${NIGHTLY}"]`).getByRole("link", { name: NIGHTLY }).click()
  await expect(page).toHaveTitle(`Run · ${NIGHTLY} · CWA benchmark`)
  await expect(page.getByRole("heading", { level: 1, name: NIGHTLY })).toBeFocused()
  await expect(page.getByText("cwa-bench-d1 0.1.0 · Python 3.14.7")).toBeVisible()
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

/** The page never overflows horizontally (DESIGN.md 4.2). */
async function expectNoOverflow(page: Page) {
  const widths = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ])
  expect(widths[0]).toBeLessThanOrEqual(widths[1]!)
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
  await expect(page.getByText("33 findings in the S7 run")).toBeVisible()
  await expectNoOverflow(page)
  await expectAccessible(page)

  await page.goto("/about")
  await expect(page.getByRole("region", { name: "Schema kinds table" })).toBeVisible()
  await expectAccessible(page)

  await page.goto("/d5")
  await expect(page.getByText("not started")).toBeVisible()
  await expectAccessible(page)

  await page.goto(`/d1/compare?from=${FAILING}&to=${NIGHTLY}`)
  await expect(page.getByText("Computed by this viewer, not by the harness")).toBeVisible()
  await expect(page.getByRole("region", { name: "Metrics that moved table" })).toBeVisible()
  await expectNoOverflow(page)
  await expectAccessible(page)
})

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
