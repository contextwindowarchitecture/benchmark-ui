// The domains whose schemas the generators read (ui-plan.md 5.3), in one place for both of them:
// where each domain's vendored schemas are, its producer's name, the prefix its type names carry
// (Domain 1 has none, since its kinds were named before a second domain existed), and any Ajv
// option a domain's schemas need beside the strict defaults (`ajv`; none today: every schema of
// both domains compiles under Ajv's full strict mode).

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
  },
]
