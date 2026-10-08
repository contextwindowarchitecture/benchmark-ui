import { CircleAlert, FileQuestion, Inbox } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { SourceError } from "@/data/source"
import type { ValidationIssue } from "@/data/validate"

/**
 * The states every data region must account for (DESIGN.md 6.3, 6.4), told apart: loading, a
 * failed load, a record the server no longer has, a part this record does not contain, a schema
 * this viewer does not read, a document that does not validate, valid zero data, and data.
 */
export type RegionState<T> =
  | { status: "loading" }
  | { status: "error"; error: SourceError; retry?: () => void }
  | { status: "not-found"; what: string }
  | { status: "absent"; what: string; newest?: { runId: string; to: string } }
  | { status: "unsupported"; schema: string | null; path: string }
  | { status: "invalid"; path: string; issues: ValidationIssue[] }
  | { status: "empty"; message: string }
  | { status: "ok"; data: T }

export type DataRegionProps<T> = {
  state: RegionState<T>
  /** What the region shows, for the state messages ("the manifest", "findings"). */
  label: string
  /** A stable-size placeholder while loading. */
  skeleton?: ReactNode
  children: (data: T) => ReactNode
}

export function DataRegion<T>({ state, label, skeleton, children }: DataRegionProps<T>) {
  switch (state.status) {
    case "loading":
      return (
        <div role="status" aria-label={`Loading ${label}`} aria-busy="true">
          {skeleton ?? <Skeleton className="h-24 w-full" />}
        </div>
      )
    case "error":
      return (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Could not load {label}</AlertTitle>
          <AlertDescription>
            <p>{state.error.message}</p>
            {state.retry && state.error.kind !== "not-found" ? (
              <Button variant="outline" size="sm" onClick={state.retry}>
                Retry
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      )
    case "not-found":
      return (
        <Alert>
          <FileQuestion />
          <AlertTitle>{state.what} is not on the server</AlertTitle>
          <AlertDescription>
            The index lists it, but its files are gone: it was pruned.
          </AlertDescription>
        </Alert>
      )
    case "absent":
      return (
        <Alert data-state="absent">
          <Inbox />
          <AlertTitle>{state.what}: not in this run</AlertTitle>
          <AlertDescription>
            {state.newest ? (
              <p>
                The newest run that has it is{" "}
                <Link to={state.newest.to} className="font-mono underline underline-offset-3">
                  {state.newest.runId}
                </Link>
                .
              </p>
            ) : (
              <p>No run in the index has it.</p>
            )}
          </AlertDescription>
        </Alert>
      )
    case "unsupported":
      return (
        <Alert data-state="unsupported">
          <CircleAlert />
          <AlertTitle>
            This viewer does not read {state.schema ?? "a document without a $schema"}
          </AlertTitle>
          <AlertDescription>
            <p>
              <span className="font-mono">{state.path}</span> names a schema kind or major version
              this build was not made for. The file is still there to download.
            </p>
          </AlertDescription>
        </Alert>
      )
    case "invalid":
      return (
        <Alert variant="destructive" data-state="invalid">
          <CircleAlert />
          <AlertTitle>
            <span className="font-mono">{state.path}</span> does not match its schema
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 font-mono text-xs">
              {state.issues.slice(0, 8).map((issue, i) => (
                <li key={i}>
                  {issue.path} {issue.message}
                </li>
              ))}
              {state.issues.length > 8 ? <li>and {state.issues.length - 8} more</li> : null}
            </ul>
          </AlertDescription>
        </Alert>
      )
    case "empty":
      return (
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          {state.message}
        </p>
      )
    case "ok":
      return <>{children(state.data)}</>
  }
}
