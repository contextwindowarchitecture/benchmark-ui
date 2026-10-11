// The domains whose schemas the generators read (ui-plan.md 5.3), in one place for both of them:
// where each domain's vendored schemas are, its producer's name, the prefix its type names carry
// (Domain 1 has none, since its kinds were named before a second domain existed), and any Ajv
// option a domain's schemas need beside the strict defaults.

export const SCHEMA_DOMAINS = [
  {
    id: "d1",
    producer: "cwa-bench-d1",
    schemas: "vendor/cwa-bench/domain1/schemas",
    prefix: "",
  },
  {
    id: "d2",
    producer: "cwa-bench-d2",
    schemas: "vendor/cwa-bench/domain2/schemas",
    prefix: "D2",
    // lq-corpus requires a question's `answer.expected` without declaring it (any value is an
    // answer), which JSON Schema allows and Ajv's strictRequired refuses. The other strict
    // checks stay on; the harness is asked to declare it (ui-plan.md section 14, ask 14).
    ajv: { strictRequired: false },
  },
]
