// Domain 5's fixture documents, validated, for model tests that need real records without a page.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { DocumentByKind, SchemaKindOf } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"

import { D5_FIXTURES_DIR } from "./fixture-fetch"

export function d5Document<K extends SchemaKindOf<"d5">>(path: string, kind: K): DocumentByKind[K] {
  const result = parseDocumentAs(
    JSON.parse(readFileSync(join(D5_FIXTURES_DIR, path), "utf8")),
    kind,
  )
  if (!result.ok) throw new Error(`${path}: ${result.reason}`)
  return result.document
}
