// A fetch over the vendored fixture runs, for tests: `${root}/d1/<path>` reads
// vendor/cwa-bench/domain1/fixtures/runs/<path> from disk and `${root}/d2/<path>` Domain 2's,
// 404s when it is not there, and streams JSONL files so the line parser is exercised the way a
// browser exercises it.

import { createReadStream, existsSync, statSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { Readable } from "node:stream"

export const FIXTURES_DIR = resolve(
  import.meta.dirname,
  "../../vendor/cwa-bench/domain1/fixtures/runs",
)

export const D2_FIXTURES_DIR = resolve(
  import.meta.dirname,
  "../../vendor/cwa-bench/domain2/fixtures/runs",
)

export const FIXTURE_ROOT = "/results"

export const FIXTURE_RUNS = {
  nightly: "20261008T133453Z-691b414",
  s7: "20261008T073129Z-a1d69f8",
  failing: "20261008T004213Z-e824f1b",
} as const

/** Domain 2's fixture: a nightly run of every suite at pilot size, trimmed by `cwabench fixture`. */
export const D2_FIXTURE_RUNS = {
  nightly: "20261011T161204Z-9c870cd",
} as const

export type FixtureFetchOptions = {
  root?: string
  /** Domain 1's runs directory; the vendored fixtures by default. */
  dir?: string
  /** Domain 2's runs directory; the vendored fixture by default. */
  d2Dir?: string
  /** Paths (relative to the results root) to answer with a given status, for failure states. */
  overrides?: Record<string, { status: number; body?: string; contentType?: string }>
  /** Called with every request, for assertions on what a page fetched. */
  onRequest?: (url: string) => void
}

export function fixtureFetch(options: FixtureFetchOptions = {}): typeof fetch {
  const root = options.root ?? FIXTURE_ROOT
  const dirs = [
    { prefix: `${root}/d1/`, dir: options.dir ?? FIXTURES_DIR },
    { prefix: `${root}/d2/`, dir: options.d2Dir ?? D2_FIXTURES_DIR },
  ]
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    options.onRequest?.(url)
    if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError")
    const override = options.overrides?.[url]
    if (override) {
      return new Response(override.body ?? "", {
        status: override.status,
        headers: { "content-type": override.contentType ?? "text/plain" },
      })
    }
    const served = dirs.find(({ prefix }) => url.startsWith(prefix))
    if (!served) return new Response("not found", { status: 404 })
    const relative = decodeURIComponent(url.slice(served.prefix.length))
    const file = join(served.dir, relative)
    if (!existsSync(file) || statSync(file).isDirectory()) {
      return new Response("not found", { status: 404 })
    }
    if (file.endsWith(".jsonl")) {
      const stream = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "application/x-ndjson" },
      })
    }
    const type = file.endsWith(".json") ? "application/json" : "text/plain; charset=utf-8"
    return new Response(await readFile(file), { status: 200, headers: { "content-type": type } })
  }
}
