import { Outlet } from "react-router"

import { usePageMeta, useRouteFocus } from "@/app/route-meta"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { SkipLink } from "./skip-link"

const SIDEBAR_COOKIE = "sidebar_state"

/** The generated sidebar persists the desktop preference in a cookie; honour it on load. */
function sidebarDefaultOpen(): boolean {
  if (typeof document === "undefined") return true
  const match = new RegExp(`(?:^|; )${SIDEBAR_COOKIE}=(true|false)`).exec(document.cookie)
  if (match) return match[1] === "true"
  // DESIGN.md 4.2: compact between 768 and 1023 px, expanded from 1024 px.
  return window.innerWidth >= 1024
}

/**
 * The one shell (DESIGN.md 4.1): skip link, collapsible sidebar, sticky header, one main. The
 * generated SidebarInset is the `main` landmark; the page region inside it takes the skip link.
 */
export function DashboardShell() {
  const meta = usePageMeta()
  useRouteFocus(meta.documentTitle)
  return (
    <>
      <SkipLink />
      <SidebarProvider defaultOpen={sidebarDefaultOpen()}>
        <AppSidebar />
        <SidebarInset id="main-content">
          <AppHeader crumbs={meta.crumbs} />
          <div id="page" tabIndex={-1} className="flex flex-1 flex-col outline-none">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
