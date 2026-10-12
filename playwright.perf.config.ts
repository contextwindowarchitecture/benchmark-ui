// The rendering and interaction budgets (DESIGN.md 11; the profile's performance line): the production
// build served by `vite preview` over the results beside this repository (the benchmark checkout's, when
// there), so the overview and the viewer are measured on the real nightly and the real 20 MB sweep. With
// PLAYWRIGHT_BASE_URL set (the container of the plan's 12.5) no server is started and that one is
// measured. Serial and one worker, so one measurement never competes with another.

import { defineConfig, devices } from "@playwright/test"

const port = 4174
const external = process.env["PLAYWRIGHT_BASE_URL"]

export default defineConfig({
  testDir: "./e2e/perf",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
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
        timeout: 60_000,
      },
})
