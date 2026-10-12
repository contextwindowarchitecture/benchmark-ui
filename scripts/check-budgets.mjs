#!/usr/bin/env node
// The bundle budgets of the project profile (DESIGN.md 11; docs/design/project-profile.md), checked over
// a production build in dist/. Sizes are gzipped, as the server sends them. The initial load is the entry
// script with every module it preloads and the stylesheet; every other chunk is loaded on a route's first
// visit or by a worker. Prints each group's size against its budget and fails when one is over.
//
//   node scripts/check-budgets.mjs [dist]

import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"

/** Budgets in gzipped kB. Change them with a measurement and a line in the profile. */
const BUDGETS = {
  /** The entry, its preloads: React, the router, the shell, Domain 1's validators. */
  initialJs: 400,
  initialCss: 20,
  /** A route's own chunk, or a chunk lazy routes share (the charts, GSAP). */
  lazyChunk: 40,
  /** A domain's generated validators, loaded on its first page. */
  validators: 100,
  /** A Web Worker's bundle (the rows and the sweep workers carry the validators they parse with). */
  worker: 120,
}

const dist = process.argv[2] ?? "dist"
const assets = join(dist, "assets")
const html = readFileSync(join(dist, "index.html"), "utf8")
const gz = (file) => gzipSync(readFileSync(join(dist, file))).byteLength / 1024

const initialJs = [
  ...html.matchAll(/<script type="module"[^>]*src="\/([^"]+)"/g),
  ...html.matchAll(/<link rel="modulepreload"[^>]*href="\/([^"]+)"/g),
].map((match) => match[1])
const initialCss = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\/([^"]+)"/g)].map(
  (match) => match[1],
)
const initial = new Set([...initialJs, ...initialCss])

const rows = []
const check = (what, size, budget) => rows.push({ what, size, budget, over: size > budget })

check(
  "initial JavaScript",
  initialJs.reduce((sum, file) => sum + gz(file), 0),
  BUDGETS.initialJs,
)
check(
  "initial CSS",
  initialCss.reduce((sum, file) => sum + gz(file), 0),
  BUDGETS.initialCss,
)
for (const name of readdirSync(assets).sort()) {
  const file = `assets/${name}`
  if (!name.endsWith(".js") || initial.has(file)) continue
  const kind = name.includes(".worker")
    ? "worker"
    : name.startsWith("validators-by-kind")
      ? "validators"
      : "lazyChunk"
  check(`${kind === "lazyChunk" ? "lazy chunk" : kind} ${name}`, gz(file), BUDGETS[kind])
}

const width = Math.max(...rows.map((row) => row.what.length))
for (const row of rows) {
  const mark = row.over ? "OVER" : "ok"
  console.log(
    `${row.what.padEnd(width)}  ${row.size.toFixed(1).padStart(7)} kB of ${String(row.budget).padStart(3)} kB  ${mark}`,
  )
}
const over = rows.filter((row) => row.over)
if (over.length > 0) {
  console.error(`\n${over.length} over budget`)
  process.exit(1)
}
console.log(`\nevery chunk within its budget (${rows.length} checked)`)
