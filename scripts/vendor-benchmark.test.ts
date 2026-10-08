// @vitest-environment node
import { spawnSync } from "node:child_process"
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

const root = resolve(import.meta.dirname, "..")
const script = join(root, "scripts/vendor-benchmark.mjs")
const benchmark = resolve(root, "..", "benchmark")

function run(args: string[]) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" })
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

describe("vendor-benchmark --check", () => {
  let copy: string

  beforeAll(() => {
    copy = mkdtempSync(join(tmpdir(), "benchmark-ui-vendor-"))
    cpSync(join(root, "vendor"), join(copy, "vendor"), { recursive: true })
  })

  afterAll(() => {
    rmSync(copy, { recursive: true, force: true })
  })

  it("passes on an unmodified copy", () => {
    const result = run(["--check", "--no-checkout", "--root", copy])
    expect(result.stderr).toBe("")
    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(
      /735 files match contextwindowarchitecture\/benchmark at [0-9a-f]{7}/,
    )
  })

  it("fails when a vendored file is edited by hand, naming it", () => {
    const path = join(copy, "vendor/cwa-bench/domain1/schemas/summary.v1.schema.json")
    const original = readFileSync(path)
    writeFileSync(path, `${original.toString()}\n`)
    try {
      const result = run(["--check", "--no-checkout", "--root", copy])
      expect(result.status).toBe(1)
      expect(result.stderr).toContain(
        "domain1/schemas/summary.v1.schema.json: differs from the lock",
      )
    } finally {
      writeFileSync(path, original)
    }
  })

  it("fails when a file is added or removed", () => {
    const extra = join(copy, "vendor/cwa-bench/docs/extra.md")
    writeFileSync(extra, "not vendored\n")
    const added = run(["--check", "--no-checkout", "--root", copy])
    rmSync(extra)
    expect(added.status).toBe(1)
    expect(added.stderr).toContain("docs/extra.md: vendored but not in the lock")

    const path = join(copy, "vendor/cwa-bench/docs/domain1.md")
    const original = readFileSync(path)
    rmSync(path)
    try {
      const removed = run(["--check", "--no-checkout", "--root", copy])
      expect(removed.status).toBe(1)
      expect(removed.stderr).toContain("docs/domain1.md: in the lock but not vendored")
    } finally {
      writeFileSync(path, original)
    }
  })

  it.skipIf(!existsSync(join(benchmark, ".git")))(
    "matches the benchmark checkout at the locked commit",
    () => {
      const result = run(["--check", benchmark, "--root", root])
      expect(result.stderr).toBe("")
      expect(result.status).toBe(0)
      expect(result.stdout).toContain(`against the lock and ${benchmark}`)
    },
  )
})
