// The browser smoke test (DESIGN.md 2.3, 14): the production build served by `vite preview` over
// the vendored fixture runs, so it needs no benchmark checkout and no results directory.

import { defineConfig, devices } from "@playwright/test"

const port = 4173

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  reporter: process.env["CI"] ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}/config.json`,
    reuseExistingServer: !process.env["CI"],
    env: { VITE_RESULTS_DIR: "vendor/cwa-bench/domain1/fixtures/runs" },
    timeout: 60_000,
  },
})
