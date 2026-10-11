// Domain 2's fixture documents, validated, for model tests that need real records without a page.

import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { DocumentByKind, SchemaKindOf } from "@/data/schema/generated"
import { parseDocumentAs } from "@/data/validate"

import { D2_FIXTURES_DIR } from "./fixture-fetch"

export function d2Document<K extends SchemaKindOf<"d2">>(path: string, kind: K): DocumentByKind[K] {
  const result = parseDocumentAs(
    JSON.parse(readFileSync(join(D2_FIXTURES_DIR, path), "utf8")),
    kind,
  )
  if (!result.ok) throw new Error(`${path}: ${result.reason}`)
  return result.document
}
