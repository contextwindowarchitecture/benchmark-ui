// Serves each domain's results tree under /results/<domain>/ in `vite dev` and `vite preview`
// (ui-plan.md 5.1): the benchmark checkout's domain1/results/d1 and domain2/results/d2 when they
// are there beside this repository, else the vendored fixture runs; VITE_RESULTS_DIR overrides
// Domain 1's and VITE_D2_RESULTS_DIR Domain 2's. Directory listing stays off, .json is
// application/json and .jsonl is application/x-ndjson, as the deployed server will serve them.
// The app never relies on the symlinks a results directory may hold (latest, nightly): aliases
// come from the runs index (DESIGN.md 6.4).

import { existsSync, statSync } from "node:fs"
import { resolve } from "node:path"

import sirv from "sirv"
import type { Plugin, PreviewServer, ViteDevServer } from "vite"

/** Each domain the site reads: where it is mounted, its run directories, and its override. */
export const RESULT_DOMAINS = [
  {
    id: "d1",
    mount: "/results/d1",
    checkout: "../benchmark/domain1/results/d1",
    fixtures: "vendor/cwa-bench/domain1/fixtures/runs",
    env: "VITE_RESULTS_DIR",
  },
  {
    id: "d2",
    mount: "/results/d2",
    checkout: "../benchmark/domain2/results/d2",
    fixtures: "vendor/cwa-bench/domain2/fixtures/runs",
    env: "VITE_D2_RESULTS_DIR",
  },
] as const

export type ResultDomain = (typeof RESULT_DOMAINS)[number]

/** Domain 1's mount, kept for the callers that name it. */
export const RESULTS_MOUNT = RESULT_DOMAINS[0].mount

/**
 * The Content Security Policy the production server sends. deploy/base/nginx/headers.inc is the
 * source of truth; this copy is sent on every dev and preview response so a violation shows up in
 * `pnpm dev` and in the Playwright run, not first in production.
 */
export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
  "font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; " +
  "base-uri 'self'; form-action 'self'"

/**
 * The policy for a dev server with a `html.cspNonce` (vite.config.ts): Vite's dev client and the
 * React plugin's refresh preamble are inline scripts, which the production policy forbids, so in
 * dev only they carry the nonce; the app's own code still has to satisfy the production policy.
 */
export function contentSecurityPolicy(nonce: string | undefined): string {
  return nonce === undefined
    ? CONTENT_SECURITY_POLICY
    : CONTENT_SECURITY_POLICY.replace("script-src 'self';", `script-src 'self' 'nonce-${nonce}';`)
}

export type ResultsDir = {
  dir: string
  origin: "override" | "benchmark checkout" | "vendored fixtures"
}

/** Where a domain's results are served from: the override, the benchmark checkout, the fixtures. */
export function resolveResultsDir(
  root: string,
  override: string | undefined,
  domain: ResultDomain = RESULT_DOMAINS[0],
): ResultsDir {
  if (override) {
    const dir = resolve(root, override)
    if (!isDirectory(dir)) throw new Error(`${domain.env}=${override} is not a directory`)
    return { dir, origin: "override" }
  }
  const benchmark = resolve(root, domain.checkout)
  if (isDirectory(benchmark)) return { dir: benchmark, origin: "benchmark checkout" }
  return { dir: resolve(root, domain.fixtures), origin: "vendored fixtures" }
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory()
}

function mount(server: ViteDevServer | PreviewServer, nonce: string | undefined) {
  const policy = contentSecurityPolicy(nonce)
  server.middlewares.use((_req, res, next) => {
    res.setHeader("Content-Security-Policy", policy)
    next()
  })
  for (const domain of RESULT_DOMAINS) {
    const override = server.config.env[domain.env] ?? process.env[domain.env]
    const { dir, origin } = resolveResultsDir(server.config.root, override, domain)
    server.config.logger.info(`  results: ${domain.mount}/ from ${dir} (${origin})`)
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
    server.middlewares.use(domain.mount, (req, res) => serve(req, res))
  }
}

export function resultsPlugin(): Plugin {
  return {
    name: "benchmark-results",
    configureServer(server) {
      mount(server, server.config.html?.cspNonce)
    },
    configurePreviewServer(server) {
      // The production build has no inline script: the exact production policy applies.
      mount(server, undefined)
    },
  }
}
