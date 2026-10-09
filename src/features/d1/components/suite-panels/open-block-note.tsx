import { Info } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/**
 * A part of the record this viewer does not read because its schema leaves the block open
 * (DESIGN.md 6.4; ui-plan.md section 14): said plainly, with what was asked of the harness.
 */
export function OpenBlockNote({ what, ask }: { what: string; ask: string }) {
  return (
    <Alert data-state="open-block">
      <Info />
      <AlertTitle>{what} is in this run, but not shown yet</AlertTitle>
      <AlertDescription>
        The summary carries it in a block its schema leaves untyped, and this viewer reads only what
        the schema promises. {ask} The file is there to download.
      </AlertDescription>
    </Alert>
  )
}
