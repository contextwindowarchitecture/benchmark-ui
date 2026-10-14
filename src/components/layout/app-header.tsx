import { useRef } from "react"

import type { Crumb } from "@/app/route-meta"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

import { Breadcrumbs } from "./breadcrumbs"
import { RunPicker } from "./run-picker"
import { ThemeToggle } from "./theme-toggle"
import { useSheetFocusReturn } from "./use-sheet-focus-return"

/**
 * The sticky top utility bar (DESIGN.md 4.1): trigger, crumbs, the run picker and the theme. Its
 * translucent, blurred paper is the website's header.
 */
export function AppHeader({ crumbs }: { crumbs: Crumb[] }) {
  const trigger = useRef<HTMLButtonElement>(null)
  useSheetFocusReturn(trigger)
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-[color-mix(in_oklab,var(--background)_88%,transparent)] px-4 backdrop-blur-[12px]">
      <SidebarTrigger ref={trigger} className="-ml-1" />
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
