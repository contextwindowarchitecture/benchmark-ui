import { ExternalLink } from "lucide-react"
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
import { useResultsDomain, useRunsIndex } from "@/data/queries"
import { resolveAlias } from "@/features/d1/model/runs"
import logoDark from "@/assets/brand/logo-dark.png"
import logoLight from "@/assets/brand/logo-light.png"
import markDark from "@/assets/brand/mark-dark.png"
import markLight from "@/assets/brand/mark-light.png"
import { buildInfo } from "@/lib/build-info"

/** The project's site, which the benchmark belongs to. */
const CWA_SITE = "https://contextwindowarchitecture.io"

/** The left navigation: the benchmark's domains, each with its pages (ui-plan.md 6.1). */
export function AppSidebar() {
  const location = useLocation()
  const params = useParams()
  const { isMobile, setOpenMobile } = useSidebar()
  const index = useRunsIndex()
  const domain = useResultsDomain()
  // Domain 1's run-scoped pages (coverage, findings) take the run in the URL when the page is one
  // of Domain 1's; another domain's run is not theirs.
  const currentRunId =
    domain === "d1" && typeof params["runId"] === "string" ? params["runId"] : null
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
                  className="flex size-8 shrink-0 items-center justify-center"
                >
                  <img src={markLight} alt="" width={96} height={66} className="w-7 dark:hidden" />
                  <img
                    src={markDark}
                    alt=""
                    width={96}
                    height={66}
                    className="hidden w-7 dark:block"
                  />
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="contextwindowarchitecture.io"
              className="h-auto"
            >
              <a
                href={CWA_SITE}
                aria-label="Context Window Architecture: contextwindowarchitecture.io"
              >
                <ExternalLink
                  aria-hidden="true"
                  className="hidden group-data-[collapsible=icon]:block"
                />
                <span className="flex flex-col gap-1 group-data-[collapsible=icon]:hidden">
                  <img
                    src={logoLight}
                    alt=""
                    width={560}
                    height={207}
                    className="h-auto w-36 dark:hidden"
                  />
                  <img
                    src={logoDark}
                    alt=""
                    width={560}
                    height={207}
                    className="hidden h-auto w-36 dark:block"
                  />
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    contextwindowarchitecture.io
                    <ExternalLink aria-hidden="true" className="size-3!" />
                  </span>
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="px-2 text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">
          Reads {buildInfo.producers.join(", ")} v1 · benchmark{" "}
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
