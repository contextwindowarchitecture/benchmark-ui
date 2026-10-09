// The rows of a fixture file, validated, for model tests that need real rows without a page.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { RowKind, RowOf } from "@/features/d1/model/row-kinds"
import { parseRows } from "@/data/validate"

import { FIXTURES_DIR } from "./fixture-fetch"

export function fixtureRows<K extends RowKind>(run: string, path: string, kind: K): RowOf<K>[] {
  const text = readFileSync(join(FIXTURES_DIR, run, path), "utf8")
  const raw = text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line, i) => ({ line: i + 1, json: JSON.parse(line) as unknown }))
  const parsed = parseRows(kind, raw)
  if (parsed.errors.length > 0 || parsed.unsupported.length > 0) {
    throw new Error(
      `${path}: ${parsed.errors.length} invalid, ${parsed.unsupported.length} unsupported rows`,
    )
  }
  return parsed.rows.map((row) => row.document)
}
