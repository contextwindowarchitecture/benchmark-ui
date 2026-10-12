// Where the content files' words come from (ui-plan.md 7.6): the benchmark repository at the
// commit the vendor lock pins. Every content module cites this source and the file it quotes; a
// test fails when the lock moves until the content has been read against the new commit and this
// constant updated, so a claim on the site always traces to a commit of its write-up.

export const CONTENT_SOURCE = {
  repository: "contextwindowarchitecture/benchmark",
  commit: "d970fef31b34d0665bfc88b52bff4703acab7e28",
} as const

export type Citation = {
  /** The file in the benchmark repository, as the vendored copy mirrors it. */
  file: string
  /** The heading the words sit under, when the file has more than one. */
  section?: string
}

/** The file at the cited commit on GitHub, for the links the narrative pages offer. */
export function sourceUrl(file: string): string {
  return `https://github.com/${CONTENT_SOURCE.repository}/blob/${CONTENT_SOURCE.commit}/${file}`
}

export const VIABILITY_DOCUMENT = "docs/benchmarking_cwa_viability.md"
export const DOMAIN_1_WRITE_UP = "docs/domain1.md"
export const DOMAIN_2_WRITE_UP = "docs/domain2.md"
