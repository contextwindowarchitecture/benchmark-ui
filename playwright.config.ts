// The browser smoke test (DESIGN.md 2.3, 14): the production build served by `vite preview` over
// the vendored fixture runs, so it needs no benchmark checkout and no results directory. With
// PLAYWRIGHT_BASE_URL set no server is started and that one is tested: the container of the plan's
// 12.5, run with the fixture runs mounted as its results (deploy/README.md).

import { defineConfig, devices } from "@playwright/test"

const port = 4173
const external = process.env["PLAYWRIGHT_BASE_URL"]

export default defineConfig({
  testDir: "./e2e",
  // The performance budgets are their own run (playwright.perf.config.ts), over the real results.
  testIgnore: "perf/**",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  reporter: process.env["CI"] ? "github" : "list",
  use: {
    baseURL: external ?? `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: external
    ? undefined
    : {
        command: `pnpm exec vite preview --port ${port} --strictPort`,
        url: `http://localhost:${port}/config.json`,
        reuseExistingServer: !process.env["CI"],
        env: {
          VITE_RESULTS_DIR: "vendor/cwa-bench/domain1/fixtures/runs",
          VITE_D2_RESULTS_DIR: "vendor/cwa-bench/domain2/fixtures/runs",
        },
        timeout: 60_000,
      },
})
