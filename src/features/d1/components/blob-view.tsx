import { Download } from "lucide-react"

import { Digest } from "@/components/dashboard/digest"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { INLINE_BLOB_BYTES } from "@/data/budgets"
import { useResultsSource } from "@/data/queries"
import { useBlob, type BlobIndexHandle } from "@/data/use-blobs"
import { formatBytes } from "@/lib/format"

/** A blob in a bounded viewer with its digest and a download link, or the state that stands in. */
export function BlobView({
  runId,
  digest,
  index,
  label,
  open = false,
}: {
  runId: string
  digest: string | null
  index: BlobIndexHandle
  label: string
  open?: boolean
}) {
  const source = useResultsSource()
  const state = useBlob(runId, digest, index)
  if (state.status === "none") {
    return (
      <p className="text-sm text-muted-foreground" data-blob="none">
        No {label}.
      </p>
    )
  }
  if (state.status === "loading")
    return <Skeleton className="h-10 w-full" aria-label={`Loading ${label}`} />
  if (state.status === "index-error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not read the blob index</AlertTitle>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    )
  }
  if (state.status === "index-over-budget") {
    return (
      <Alert data-blob="index-over-budget">
        <AlertTitle>The blob index is too large to resolve here</AlertTitle>
        <AlertDescription>
          The {label} is <Digest value={digest ?? ""} label={`${label} digest`} />; the index lists
          its path.
        </AlertDescription>
      </Alert>
    )
  }
  if (state.status === "missing") {
    return (
      <p className="text-sm text-muted-foreground" data-blob="missing">
        {label}: hash only, <Digest value={state.digest} label={`${label} digest`} />. The harness
        keeps blobs for the conformance and labeled suites and for failures.
      </p>
    )
  }
  const download = (
    <a
      href={source.url(runId, state.entry.path)}
      download
      className="inline-flex min-h-6 items-center gap-1 text-xs underline underline-offset-3"
    >
      <Download aria-hidden="true" className="size-3" /> download ({formatBytes(state.entry.bytes)})
    </a>
  )
  if (state.status === "too-large") {
    return (
      <p className="text-sm" data-blob="too-large">
        {label} is {formatBytes(state.entry.bytes)}, above the {formatBytes(INLINE_BLOB_BYTES)}{" "}
        inline budget. {download}
      </p>
    )
  }
  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load {label}</AlertTitle>
        <AlertDescription>
          {state.message} {download}
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <details open={open} className="group rounded-lg border" data-blob="ready">
      <summary className="cursor-pointer px-3 py-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          {state.entry.media_type} · {formatBytes(state.entry.bytes)}
        </span>
      </summary>
      <div className="flex flex-wrap items-center gap-4 border-t px-3 py-1 text-xs">
        <Digest value={state.entry.digest} label={`${label} digest`} />
        {download}
      </div>
      <pre
        tabIndex={0}
        role="region"
        aria-label={`${label} contents`}
        className="max-h-96 overflow-auto border-t px-3 py-2 font-mono text-xs leading-5 whitespace-pre focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {state.text}
      </pre>
    </details>
  )
}
