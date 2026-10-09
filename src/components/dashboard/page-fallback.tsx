import { Skeleton } from "@/components/ui/skeleton"

import { DashboardPage } from "./dashboard-page"

/** What a lazily loaded page shows while its module arrives: the title, and stable-size blocks. */
export function PageFallback({ title, width }: { title: string; width?: "standard" | "wide" }) {
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
