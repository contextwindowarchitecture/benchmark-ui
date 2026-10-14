// The shape of a question page's words (UI-D2c; UI-D5), for every domain with question pages: the
// viability document's metric, what it expected, the paper it adapts, how the domain measures it
// instead, and what the write-up concludes. Each domain's words are in its own content file.

import type { Citation } from "./source"

export type Paper = { title: string; authors: string; url: string; text: string }

export type QuestionWords<Id extends string = string> = {
  /** The page's path under the domain's base. */
  id: Id
  /** The page's title. */
  title: string
  /** The question the page answers, in one sentence. */
  question: string
  /**
   * The viability document's metric: where it says it, its name, the conventional baseline and
   * CWA's expected outcome.
   */
  viability: {
    /** Where the document states it: a row of its table, its hypothesis. */
    where: string
    metric: string
    baseline: string
    expected: string
    citation: Citation
  }
  /** The paper the viability document proposes adapting, or the domain adopts, when there is one. */
  paper?: Paper
  /** Further papers the page draws on. */
  morePapers?: readonly Paper[]
  /** How the domain measures it instead, and how that differs from the paper and the document. */
  measured: readonly string[]
  /** What the write-up concludes on it. */
  writeUp: { text: readonly string[]; citation: Citation }
}
