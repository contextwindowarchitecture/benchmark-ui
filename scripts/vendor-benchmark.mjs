#!/usr/bin/env node
// Vendors the benchmark's contract into this repository by copy at a pinned commit, the way the
// assemblers vendor the specification (ui-plan.md 3.1; DESIGN.md 6.4, 12).
//
//   node scripts/vendor-benchmark.mjs <checkout>           copy, hash and rewrite the lock
//   node scripts/vendor-benchmark.mjs --check [checkout]   fail on drift between the lock, the
//                                                          vendored copy and the checkout at the
//                                                          locked commit
//
// Options: --root <dir> (this repository's root; defaults to the script's parent directory) and
// --no-checkout (with --check: compare the copy with the lock only). With --check and no checkout
// argument, $BENCHMARK_CHECKOUT is used, then ../benchmark beside the root when it is a git work
// tree; otherwise the checkout comparison is skipped and said so.
//
// Only Node built-ins, so the script runs before `pnpm install`.

import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const VENDOR_DIR = "vendor/cwa-bench"
const LOCK_FILE = "vendor/cwa-bench.lock.json"
const EXPECTED_REPOSITORY = "contextwindowarchitecture/benchmark"

// What is vendored, relative to the benchmark root (ui-plan.md 3.1): the schemas the types are
// generated from, the fixture runs the tests run against, and the write-ups. Each source is a git
// pathspec plus a filter over the paths git lists under it (git's tree listing takes no globs).
const SOURCES = [
  {
    pathspec: "domain1/schemas",
    keep: (path) => /^domain1\/schemas\/[^/]+\.v1\.schema\.json$/.test(path),
  },
  { pathspec: "domain1/fixtures/runs", keep: () => true },
  { pathspec: "docs/domain1.md", keep: () => true },
  { pathspec: "docs/benchmarking_cwa_viability.md", keep: () => true },
]
const PATHSPECS = SOURCES.map((source) => source.pathspec)

function vendored(paths) {
  return paths
    .filter((path) =>
      SOURCES.some((source) => path.startsWith(source.pathspec) && source.keep(path)),
    )
    .sort()
}

function main(argv) {
  const args = parseArgs(argv)
  const root = args.root ?? resolve(dirname(fileURLToPath(import.meta.url)), "..")
  if (args.check) {
    return check(root, args)
  }
  if (!args.checkout) {
    usage()
    return 2
  }
  return vendor(root, resolve(args.checkout))
}

function parseArgs(argv) {
  const args = { check: false, noCheckout: false, root: null, checkout: null }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--check") args.check = true
    else if (arg === "--no-checkout") args.noCheckout = true
    else if (arg === "--root") args.root = resolve(argv[++i] ?? ".")
    else if (arg === "--help" || arg === "-h") {
      usage()
      process.exit(0)
    } else if (arg.startsWith("-")) fail(`unknown option ${arg}`)
    else if (args.checkout === null) args.checkout = arg
    else fail(`unexpected argument ${arg}`)
  }
  return args
}

function usage() {
  process.stderr.write(
    "usage: vendor-benchmark.mjs <checkout> | --check [checkout] [--no-checkout] [--root <dir>]\n",
  )
}

function fail(message) {
  process.stderr.write(`vendor-benchmark: ${message}\n`)
  process.exit(2)
}

// --- git -----------------------------------------------------------------------------------------

function git(checkout, args, options = {}) {
  const result = spawnSync("git", ["-C", checkout, ...args], {
    ...(options.binary ? {} : { encoding: "utf8" }),
    input: options.input === undefined ? undefined : Buffer.from(options.input),
    maxBuffer: 1024 * 1024 * 1024,
  })
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString() : result.stderr
    throw new Error(`git ${args.join(" ")} failed in ${checkout}: ${stderr.trim()}`)
  }
  return result.stdout
}

function isWorkTree(dir) {
  if (!existsSync(dir)) return false
  const result = spawnSync("git", ["-C", dir, "rev-parse", "--is-inside-work-tree"], {
    encoding: "utf8",
  })
  return result.status === 0 && result.stdout.trim() === "true"
}

// The repository slug from the origin remote: GitHub over ssh (git@github.com:owner/repo[.git]),
// ssh:// or https://.
function repositorySlug(url) {
  const match =
    /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(url) ??
    /^(?:ssh:\/\/git@|https:\/\/)github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(url)
  return match ? match[1] : null
}

function listTracked(checkout) {
  return vendored(git(checkout, ["ls-files", "-z", "--", ...PATHSPECS]).split("\0"))
}

function listAtCommit(checkout, commit) {
  return vendored(
    git(checkout, ["ls-tree", "-r", "-z", "--name-only", commit, "--", ...PATHSPECS]).split("\0"),
  )
}

// Hashes every path as it is at the commit, through one `git cat-file --batch` process.
function hashesAtCommit(checkout, commit, paths) {
  const input = paths.map((path) => `${commit}:${path}\n`).join("")
  const out = git(checkout, ["cat-file", "--batch"], { input, binary: true })
  const hashes = new Map()
  let offset = 0
  for (const path of paths) {
    const newline = out.indexOf(0x0a, offset)
    if (newline < 0) throw new Error(`git cat-file --batch: truncated output at ${path}`)
    const header = out.subarray(offset, newline).toString()
    offset = newline + 1
    const fields = header.split(" ")
    if (fields[1] === "missing") throw new Error(`${path} is not at ${commit}`)
    const size = Number.parseInt(fields[2], 10)
    hashes.set(path, sha256(out.subarray(offset, offset + size)))
    offset += size + 1 // the content and the newline that follows it
  }
  return hashes
}

// --- files ---------------------------------------------------------------------------------------

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex")
}

function walk(dir, base = dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(path, base))
    else files.push(relative(base, path).split(sep).join("/"))
  }
  return files.sort()
}

function readLock(root) {
  const path = join(root, LOCK_FILE)
  if (!existsSync(path)) fail(`${LOCK_FILE} is missing; run the script with a checkout first`)
  return JSON.parse(readFileSync(path, "utf8"))
}

// --- vendor --------------------------------------------------------------------------------------

function vendor(root, checkout) {
  if (!isWorkTree(checkout)) fail(`${checkout} is not a git work tree`)
  const commit = git(checkout, ["rev-parse", "HEAD"]).trim()
  const origin = git(checkout, ["remote", "get-url", "origin"]).trim()
  const repository = repositorySlug(origin)
  if (!repository) fail(`cannot derive a GitHub repository from origin ${origin}`)
  if (repository !== EXPECTED_REPOSITORY) {
    process.stderr.write(
      `vendor-benchmark: warning: origin is ${repository}, not ${EXPECTED_REPOSITORY}\n`,
    )
  }
  const dirty = git(checkout, ["status", "--porcelain", "--untracked-files=no"]).trim().length > 0
  if (dirty) {
    process.stderr.write(
      "vendor-benchmark: warning: the checkout has uncommitted changes; the lock says so\n",
    )
  }

  const paths = listTracked(checkout)
  if (paths.length === 0) fail(`nothing to vendor under ${checkout}`)
  const target = join(root, VENDOR_DIR)
  rmSync(target, { recursive: true, force: true })
  const files = {}
  for (const path of paths) {
    const bytes = readFileSync(join(checkout, path))
    const destination = join(target, path)
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, bytes)
    files[path] = sha256(bytes)
  }
  const lock = { repository, commit, dirty, files }
  writeFileSync(join(root, LOCK_FILE), `${JSON.stringify(lock, null, 2)}\n`)
  process.stdout.write(
    `vendored ${paths.length} files from ${repository} at ${commit.slice(0, 7)}${dirty ? " (dirty)" : ""} into ${VENDOR_DIR}\n`,
  )
  return 0
}

// --- check ---------------------------------------------------------------------------------------

function check(root, args) {
  const lock = readLock(root)
  const problems = []
  const locked = new Map(Object.entries(lock.files))

  // The copy against the lock.
  const target = join(root, VENDOR_DIR)
  const present = existsSync(target) ? walk(target) : []
  for (const path of present) {
    const expected = locked.get(path)
    if (expected === undefined) problems.push(`${path}: vendored but not in the lock`)
    else if (sha256(readFileSync(join(target, path))) !== expected)
      problems.push(`${path}: differs from the lock`)
  }
  for (const path of locked.keys()) {
    if (!present.includes(path)) problems.push(`${path}: in the lock but not vendored`)
  }

  // The lock against the checkout at the locked commit.
  let checkout = null
  if (!args.noCheckout) {
    checkout = args.checkout ?? process.env.BENCHMARK_CHECKOUT ?? null
    if (checkout === null) {
      const sibling = resolve(root, "..", "benchmark")
      if (isWorkTree(sibling)) checkout = sibling
    }
  }
  if (checkout !== null) {
    checkout = resolve(checkout)
    if (!isWorkTree(checkout)) fail(`${checkout} is not a git work tree`)
    const exists = spawnSync("git", ["-C", checkout, "cat-file", "-e", `${lock.commit}^{commit}`])
    if (exists.status !== 0) {
      problems.push(`commit ${lock.commit} is not in ${checkout}`)
    } else {
      const origin = git(checkout, ["remote", "get-url", "origin"]).trim()
      const repository = repositorySlug(origin)
      if (repository !== lock.repository)
        problems.push(`${checkout} is ${repository ?? origin}, the lock pins ${lock.repository}`)
      const paths = listAtCommit(checkout, lock.commit)
      const hashes = hashesAtCommit(checkout, lock.commit, paths)
      for (const [path, hash] of hashes) {
        const expected = locked.get(path)
        if (expected === undefined)
          problems.push(`${path}: at ${lock.commit.slice(0, 7)} but not in the lock`)
        else if (hash !== expected)
          problems.push(`${path}: the lock differs from ${lock.commit.slice(0, 7)}`)
      }
      for (const path of locked.keys()) {
        if (!hashes.has(path))
          problems.push(`${path}: in the lock but not at ${lock.commit.slice(0, 7)}`)
      }
    }
  }

  const where =
    checkout === null ? "against the lock only (no checkout)" : `against the lock and ${checkout}`
  if (problems.length > 0) {
    process.stderr.write(`vendor-benchmark: ${problems.length} problem(s) ${where}:\n`)
    for (const problem of problems) process.stderr.write(`  ${problem}\n`)
    return 1
  }
  process.stdout.write(
    `vendor-benchmark: ${locked.size} files match ${lock.repository} at ${lock.commit.slice(0, 7)}${lock.dirty ? " (dirty)" : ""}, ${where}\n`,
  )
  return 0
}

process.exit(main(process.argv.slice(2)))
