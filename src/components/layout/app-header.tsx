import type { Crumb } from "@/app/route-meta"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

import { Breadcrumbs } from "./breadcrumbs"
import { RunPicker } from "./run-picker"
import { ThemeToggle } from "./theme-toggle"

/** The sticky top utility bar (DESIGN.md 4.1): trigger, crumbs, the run picker and the theme. */
export function AppHeader({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
      <div className="min-w-0 flex-1">
        <Breadcrumbs crumbs={crumbs} />
      </div>
      <div className="hidden md:block">
        <RunPicker />
      </div>
      <ThemeToggle />
    </header>
  )
}
