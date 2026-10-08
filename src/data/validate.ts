// The validating boundary (DESIGN.md 6.4; ui-plan.md 5.3). Every document names its schema; this
// module gates on it. A kind this viewer knows at a major version it knows is validated with the
// validator generated from the vendored JSON Schema and typed; anything else is an
// UnsupportedSchema result, never a guess. Rows are validated one by one and a bad row is reported
// with its line number.

import type { ErrorObject } from "ajv"

import { schemaKinds, type DocumentByKind, type SchemaKind } from "./schema/generated"
import { validators } from "./schema/generated/validators-by-kind"
import type { RawRow, RowError } from "./source"

export const PRODUCER = "cwa-bench-d1"

const SCHEMA_PATTERN = /^cwa-bench-d1\/([a-z0-9-]+)\/v([1-9][0-9]*)$/

export type SchemaRef = { kind: string; version: number }

/** Reads `<producer>/<kind>/v<n>`; null when the string is not in that form. */
export function parseSchemaString(schema: unknown): SchemaRef | null {
  if (typeof schema !== "string") return null
  const match = SCHEMA_PATTERN.exec(schema)
  if (!match) return null
  return { kind: match[1] as string, version: Number(match[2]) }
}

export function isKnownKind(kind: string): kind is SchemaKind {
  return Object.hasOwn(schemaKinds, kind)
}

export type ValidationIssue = { path: string; message: string }

export type ParsedDocument<K extends SchemaKind = SchemaKind> = {
  ok: true
  kind: K
  version: number
  document: DocumentByKind[K]
}

/** The document names a kind or a major version this build does not read (DESIGN.md 6.3). */
export type UnsupportedSchema = {
  ok: false
  reason: "unsupported-schema"
  /** The `$schema` string as found, or null when there was none. */
  schema: string | null
  kind: string | null
  version: number | null
}

/** The document names a known schema but does not validate against it. */
export type InvalidDocument = {
  ok: false
  reason: "invalid"
  schema: string
  kind: SchemaKind
  issues: ValidationIssue[]
}

/** The document is valid but of a different kind than the caller asked for. */
export type WrongKind = {
  ok: false
  reason: "wrong-kind"
  expected: SchemaKind
  actual: SchemaKind
}

export type ParseResult = ParsedDocument | UnsupportedSchema | InvalidDocument
export type ParseResultOf<K extends SchemaKind> =
  ParsedDocument<K> | UnsupportedSchema | InvalidDocument | WrongKind

function issues(errors: ErrorObject[] | null | undefined): ValidationIssue[] {
  return (errors ?? []).map((error) => ({
    path: error.instancePath === "" ? "/" : error.instancePath,
    message: error.message ?? error.keyword,
  }))
}

/** Validates `json` as the kind its `$schema` names. Reads nothing the schema does not promise. */
export function parseDocument(json: unknown): ParseResult {
  const schema =
    typeof json === "object" && json !== null && !Array.isArray(json)
      ? (json as Record<string, unknown>)["$schema"]
      : undefined
  const ref = parseSchemaString(schema)
  if (ref === null) {
    return {
      ok: false,
      reason: "unsupported-schema",
      schema: typeof schema === "string" ? schema : null,
      kind: null,
      version: null,
    }
  }
  if (!isKnownKind(ref.kind) || schemaKinds[ref.kind].version !== ref.version) {
    return { ok: false, reason: "unsupported-schema", schema: schema as string, ...ref }
  }
  const kind = ref.kind
  // Standalone validators generated at build time (scripts/generate-validators.mjs): nothing is
  // compiled in the browser, so the site runs under `script-src 'self'` with no 'unsafe-eval'.
  const validate = validators[kind]
  if (!validate(json)) {
    return {
      ok: false,
      reason: "invalid",
      schema: schema as string,
      kind,
      issues: issues(validate.errors),
    }
  }
  return { ok: true, kind, version: ref.version, document: json as DocumentByKind[typeof kind] }
}

/** parseDocument, plus the check that the document is of the kind the caller expects. */
export function parseDocumentAs<K extends SchemaKind>(json: unknown, kind: K): ParseResultOf<K> {
  const result = parseDocument(json)
  if (!result.ok) return result
  if (result.kind !== kind)
    return { ok: false, reason: "wrong-kind", expected: kind, actual: result.kind }
  return result as ParsedDocument<K>
}

export type ParsedRow<K extends SchemaKind> = { line: number; document: DocumentByKind[K] }

export type ParsedRows<K extends SchemaKind> = {
  rows: ParsedRow<K>[]
  /** Lines that were not JSON or did not validate, by line number; the rest of the file renders. */
  errors: RowError[]
  /** Lines that named another schema than the file's; counted, reported, not rendered. */
  unsupported: { line: number; schema: string | null }[]
}

/** Validates the rows of a JSONL file as `kind`, keeping every row's line number. */
export function parseRows<K extends SchemaKind>(
  kind: K,
  rows: RawRow[],
  jsonErrors: RowError[] = [],
): ParsedRows<K> {
  const parsed: ParsedRow<K>[] = []
  const errors: RowError[] = [...jsonErrors]
  const unsupported: { line: number; schema: string | null }[] = []
  for (const row of rows) {
    const result = parseDocumentAs(row.json, kind)
    if (result.ok) {
      parsed.push({ line: row.line, document: result.document })
    } else if (result.reason === "invalid") {
      errors.push({
        line: row.line,
        message: result.issues.map((issue) => `${issue.path} ${issue.message}`).join("; "),
      })
    } else if (result.reason === "wrong-kind") {
      unsupported.push({
        line: row.line,
        schema: `${PRODUCER}/${result.actual}/v${schemaKinds[result.actual].version}`,
      })
    } else {
      unsupported.push({ line: row.line, schema: result.schema })
    }
  }
  errors.sort((a, b) => a.line - b.line)
  return { rows: parsed, errors, unsupported }
}

/** The schema string this build reads for a kind, for "this viewer reads" texts. */
export function schemaStringOf(kind: SchemaKind): string {
  return `${PRODUCER}/${kind}/v${schemaKinds[kind].version}`
}
