// Serves a results tree under /results/d1/ in `vite dev` and `vite preview` (ui-plan.md 5.1): the
// benchmark checkout's domain1/results/d1 when it is there beside this repository, else the
// vendored fixture runs; VITE_RESULTS_DIR overrides both. Directory listing stays off, .json is
// application/json and .jsonl is application/x-ndjson, as the deployed server will serve them.
// The app never relies on the symlinks a results directory may hold (latest, nightly): aliases
// come from the runs index (DESIGN.md 6.4).

import { existsSync, statSync } from "node:fs"
import { resolve } from "node:path"

import sirv from "sirv"
import type { Plugin, PreviewServer, ViteDevServer } from "vite"

export const RESULTS_MOUNT = "/results/d1"

export type ResultsDir = {
  dir: string
  origin: "VITE_RESULTS_DIR" | "benchmark checkout" | "vendored fixtures"
}

export function resolveResultsDir(root: string, override: string | undefined): ResultsDir {
  if (override) {
    const dir = resolve(root, override)
    if (!isDirectory(dir)) throw new Error(`VITE_RESULTS_DIR=${override} is not a directory`)
    return { dir, origin: "VITE_RESULTS_DIR" }
  }
  const benchmark = resolve(root, "../benchmark/domain1/results/d1")
  if (isDirectory(benchmark)) return { dir: benchmark, origin: "benchmark checkout" }
  return {
    dir: resolve(root, "vendor/cwa-bench/domain1/fixtures/runs"),
    origin: "vendored fixtures",
  }
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory()
}

function mount(server: ViteDevServer | PreviewServer) {
  const override = server.config.env["VITE_RESULTS_DIR"] ?? process.env["VITE_RESULTS_DIR"]
  const { dir, origin } = resolveResultsDir(server.config.root, override)
  server.config.logger.info(`  results: ${RESULTS_MOUNT}/ from ${dir} (${origin})`)
  const serve = sirv(dir, {
    dev: true, // re-stat every request: the directory changes under the dev server
    etag: true,
    dotfiles: false,
    // Without this sirv hands a miss to Vite, whose SPA fallback would answer 200 with index.html.
    onNoMatch(_req, res) {
      res.statusCode = 404
      res.setHeader("Content-Type", "text/plain; charset=utf-8")
      res.end("not found")
    },
    setHeaders(res, pathname) {
      if (pathname.endsWith(".jsonl")) res.setHeader("Content-Type", "application/x-ndjson")
      else if (pathname.endsWith(".json")) res.setHeader("Content-Type", "application/json")
      // Mirror the deployed cache policy (ui-plan.md 12.3): the index changes, runs do not.
      res.setHeader("Cache-Control", pathname === "/index.json" ? "no-cache" : "no-store")
    },
  })
  // Called without `next`, so a miss ends in onNoMatch rather than in Vite's SPA fallback; a
  // directory gets its index.html if it has one and a 404 otherwise, never a listing.
  server.middlewares.use(RESULTS_MOUNT, (req, res) => serve(req, res))
}

export function resultsPlugin(): Plugin {
  return {
    name: "benchmark-results",
    configureServer(server) {
      mount(server)
    },
    configurePreviewServer(server) {
      mount(server)
    },
  }
}
