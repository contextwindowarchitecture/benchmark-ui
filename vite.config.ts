import { execFileSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import { resultsPlugin } from "./dev/results-plugin.ts"

const root = import.meta.dirname

// What the footer shows beside each run's own provenance (ui-plan.md 3.1): the viewer's commit
// and the benchmark commit the lock pins, so a reader can tell the viewer's contract from the run's.
function uiCommit(): string {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
    }).trim()
  } catch {
    return "dev"
  }
}

function benchmarkCommit(): string {
  const lock = JSON.parse(readFileSync(path.join(root, "vendor/cwa-bench.lock.json"), "utf8")) as {
    commit: string
  }
  return lock.commit
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), resultsPlugin()],
  // Dev only: Vite's client and the React refresh preamble are inline scripts, and the results
  // plugin sends the production Content Security Policy on every response (dev/results-plugin.ts).
  // With a nonce Vite stamps the tags it injects and the policy admits them; the build injects no
  // inline script, so the production policy applies unchanged.
  html: command === "serve" ? { cspNonce: randomBytes(16).toString("base64") } : {},
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
  define: {
    __UI_COMMIT__: JSON.stringify(uiCommit()),
    __BENCHMARK_COMMIT__: JSON.stringify(benchmarkCommit()),
  },
}))
