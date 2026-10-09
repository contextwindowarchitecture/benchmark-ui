import { PageSection } from "@/components/dashboard/dashboard-page"

import { SUITE_PANELS } from "./registry"
import type { SuitePanelProps } from "./types"

/** The suite's own panel, or a note that this suite has none beyond the common parts. */
export function SuitePanel(props: SuitePanelProps) {
  const Panel = SUITE_PANELS[props.suite]
  if (!Panel) {
    return (
      <PageSection title="Suite panel" id="panel">
        <p
          className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
          data-state="empty"
        >
          This viewer has no dedicated panel for {props.suite}; its metrics and rows are above and
          below.
        </p>
      </PageSection>
    )
  }
  return <Panel {...props} />
}
