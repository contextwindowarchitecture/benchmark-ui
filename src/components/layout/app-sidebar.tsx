import { Link, useLocation, useParams } from "react-router"

import { isNavItemActive, navigation } from "@/app/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { useRunsIndex } from "@/data/queries"
import { resolveAlias } from "@/features/d1/model/runs"
import { buildInfo } from "@/lib/build-info"

/** The left navigation: the benchmark's domains, each with its pages (ui-plan.md 6.1). */
export function AppSidebar() {
  const location = useLocation()
  const params = useParams()
  const { isMobile, setOpenMobile } = useSidebar()
  const index = useRunsIndex()
  const currentRunId = typeof params["runId"] === "string" ? params["runId"] : null
  // Run-scoped pages without a run in the URL point at the latest run, resolved from the index.
  const latest = index.data?.ok
    ? (resolveAlias(index.data.document, "latest")?.run_id ?? null)
    : null
  const runId = currentRunId ?? latest

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="CWA benchmark">
              <Link to="/" onClick={() => isMobile && setOpenMobile(false)}>
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-xs font-semibold text-primary-foreground"
                >
                  CWA
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-semibold">CWA benchmark</span>
                  <span className="text-xs text-muted-foreground">viability results</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isNavItemActive(item, location.pathname)
                  const href = item.href(runId)
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link
                          to={href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => isMobile && setOpenMobile(false)}
                        >
                          <Icon aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">
          Reads {buildInfo.producer} v1 · benchmark{" "}
          <span className="font-mono" title={buildInfo.benchmarkCommit}>
            {buildInfo.benchmarkCommit.slice(0, 7)}
          </span>{" "}
          · ui <span className="font-mono">{buildInfo.uiCommit}</span>
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
