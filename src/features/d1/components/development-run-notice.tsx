import { History } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DEFECTS_CITATION, DEVELOPMENT_RUN_NOTE, isDevelopmentRun, sourceUrl } from "@/content"

/**
 * Says plainly, on the pages of the failing run of 2026-10-08, that it is the development-time
 * record of the defects and not a reported result (the write-up's "Defects it found").
 */
export function DevelopmentRunNotice({ runId }: { runId: string }) {
  if (!isDevelopmentRun(runId)) return null
  return (
    <Alert data-state="development-run">
      <History />
      <AlertTitle>{DEVELOPMENT_RUN_NOTE.title}</AlertTitle>
      <AlertDescription>
        <p>
          {DEVELOPMENT_RUN_NOTE.text}{" "}
          <a
            href={sourceUrl(DEFECTS_CITATION.file)}
            rel="noreferrer"
            className="underline underline-offset-3"
          >
            {DEFECTS_CITATION.file}
          </a>
          , {DEFECTS_CITATION.section}.
        </p>
      </AlertDescription>
    </Alert>
  )
}
