// Blobs by digest (DESIGN.md 6.4; ui-plan.md 4.2): the run's blob index resolves a digest to its
// path, media type and size, through the rows store since a nightly indexes 9,605 blobs; the blob
// itself then comes through the query cache, immutable for the session.

import { useMemo } from "react"

import { prettyJson } from "@/lib/line-diff"

import { INLINE_BLOB_BYTES } from "./budgets"
import { useRunBlob } from "./queries"
import type { BlobV1, RunIndexV1 } from "./schema/generated"
import { useRowPage, useRows, type RowsHandle } from "./use-rows"

export type BlobIndexHandle = RowsHandle<"blob">

/** The run's blob index, loaded once the run index says where it is and how big. */
export function useBlobIndex(
  runId: string | undefined,
  index: RunIndexV1 | undefined,
): BlobIndexHandle {
  return useRows(runId, index?.blobs.index ?? "blobs/index.jsonl", "blob", {
    expectedRows: index?.blobs.count,
    enabled: index !== undefined,
  })
}

export type BlobEntryState = {
  /** The entry; null when the index does not list the digest; undefined while unknown. */
  entry: BlobV1 | null | undefined
  pending: boolean
}

/** One digest's entry in the blob index; a digest of null asks for nothing. */
export function useBlobEntry(handle: BlobIndexHandle, digest: string | null): BlobEntryState {
  const { page, pending } = useRowPage(handle, {
    filter: { caseId: digest ?? "" },
    page: 1,
    pageSize: 1,
  })
  if (digest === null) return { entry: null, pending: false }
  if (!page) return { entry: undefined, pending }
  return { entry: page.rows[0]?.document ?? null, pending }
}

export type BlobState =
  | { status: "none" }
  | { status: "loading" }
  | { status: "index-error"; message: string }
  | { status: "index-over-budget" }
  /** The run's index does not list the digest: hashes only. */
  | { status: "missing"; digest: string }
  | { status: "too-large"; entry: BlobV1 }
  | { status: "error"; entry: BlobV1; message: string }
  | { status: "ready"; entry: BlobV1; text: string; json: unknown | undefined }

/** One blob by digest, through the index and the query cache; its text is ready for a viewer or a diff. */
export function useBlob(runId: string, digest: string | null, index: BlobIndexHandle): BlobState {
  const { entry } = useBlobEntry(index, digest)
  const ref =
    entry && entry.bytes <= INLINE_BLOB_BYTES
      ? { digest: entry.digest, path: entry.path }
      : undefined
  const blob = useRunBlob(runId, ref)
  return useMemo<BlobState>(() => {
    if (digest === null) return { status: "none" }
    if (index.status === "error") return { status: "index-error", message: index.error.message }
    if (index.status === "over-budget") return { status: "index-over-budget" }
    if (index.status !== "ready" || entry === undefined) return { status: "loading" }
    if (entry === null) return { status: "missing", digest }
    if (entry.bytes > INLINE_BLOB_BYTES) return { status: "too-large", entry }
    if (blob.isPending) return { status: "loading" }
    if (blob.isError) return { status: "error", entry, message: blob.error.message }
    const data = blob.data
    if (entry.media_type === "application/json") {
      return { status: "ready", entry, text: prettyJson(data), json: data }
    }
    return {
      status: "ready",
      entry,
      text: typeof data === "string" ? data : prettyJson(data),
      json: undefined,
    }
  }, [digest, index, entry, blob.isPending, blob.isError, blob.error, blob.data])
}
