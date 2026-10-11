import { useLayoutEffect } from "react"

import { Skeleton } from "@/components/ui/skeleton"

import { DashboardPage } from "./dashboard-page"
import { handOffTitleFocus } from "./title-focus"

/** What a lazily loaded page shows while its module arrives: the title, and stable-size blocks. */
export function PageFallback({ title, width }: { title: string; width?: "standard" | "wide" }) {
  // Runs before the fallback leaves the DOM: if its title holds the route focus, the page takes it.
  useLayoutEffect(
    () => () => {
      if (document.activeElement?.id === "page-title") handOffTitleFocus()
    },
    [],
  )
  return (
    <DashboardPage title={title} width={width}>
      <div role="status" aria-label={`Loading ${title}`} aria-busy="true" className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </DashboardPage>
  )
}
