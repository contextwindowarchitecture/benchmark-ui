// One smoke test over the fixtures: the shell, the runs list and a run page render from the
// production build, and axe finds nothing on them.

import { AxeBuilder } from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const NIGHTLY = "20261008T133453Z-691b414"

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
  await expectAccessible(page)

  await page.getByRole("link", { name: "All runs" }).click()
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
  // The page never overflows horizontally (DESIGN.md 4.2).
  const widths = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ])
  expect(widths[0]).toBeLessThanOrEqual(widths[1]!)
  await expectAccessible(page)
})

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
