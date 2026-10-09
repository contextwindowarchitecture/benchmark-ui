// What a route tells the shell (DESIGN.md 4.3): its page name for the document title, and its
// breadcrumb, which reflects hierarchy, not history.

import { useEffect, useRef } from "react"
import { useLocation, useMatches, type Location, type Params, type UIMatch } from "react-router"

export type Crumb = { label: string; to?: string }

export type RouteHandle = {
  /** The page's name: the document title's first part and the last crumb when `crumb` is absent. */
  title: (params: Params) => string
  /** This match's crumb; structural routes leave it out. */
  crumb?: (params: Params) => Crumb
}

export const SITE_TITLE = "CWA benchmark"

type AppMatch = UIMatch<unknown, RouteHandle | undefined>

export function useAppMatches(): AppMatch[] {
  return useMatches() as AppMatch[]
}

export type PageMeta = {
  title: string
  runId: string | undefined
  crumbs: Crumb[]
  documentTitle: string
}

/** The page name, run id and crumbs of the current location, from the matched routes' handles. */
export function usePageMeta(): PageMeta {
  const matches = useAppMatches()
  const leaf = [...matches].reverse().find((match) => match.handle?.title)
  const title = leaf?.handle?.title(leaf.params) ?? SITE_TITLE
  const runId = typeof leaf?.params["runId"] === "string" ? leaf.params["runId"] : undefined
  const crumbs = matches.flatMap((match) =>
    match.handle?.crumb ? [match.handle.crumb(match.params)] : [],
  )
  // `<page> · <run id> · CWA benchmark` (ui-plan.md 6.2); the home page is the site title alone.
  const documentTitle =
    title === SITE_TITLE
      ? SITE_TITLE
      : [title, runId, SITE_TITLE].filter((part) => part !== undefined).join(" · ")
  return { title, runId, crumbs, documentTitle }
}

/**
 * On every navigation: set the document title and move focus to the page title, or to the page
 * region when a page has none, so keyboard and screen-reader users land on the new page. A URL
 * with a fragment lands on the element it names instead, on the first render too, since the page
 * that holds it renders after the browser has looked for it. A change to the query string alone is
 * a filter being typed or picked, not a navigation, and leaves focus where it is.
 */
export function useRouteFocus(documentTitle: string) {
  const location = useLocation()
  const last = useRef<Location | null>(null)
  useEffect(() => {
    document.title = documentTitle
  }, [documentTitle])
  useEffect(() => {
    const previous = last.current
    last.current = location
    // The same navigation again: Strict Mode re-running the effect.
    if (previous?.key === location.key) return
    if (
      previous &&
      previous.pathname === location.pathname &&
      previous.hash === location.hash &&
      previous.search !== location.search
    )
      return
    const anchor = location.hash ? document.getElementById(fragmentId(location.hash)) : null
    if (anchor) {
      const land = () => {
        if (anchor.isConnected && last.current?.key === location.key)
          anchor.scrollIntoView?.({ block: "start" })
      }
      land()
      if (anchor.hasAttribute("tabindex")) anchor.focus({ preventScroll: true })
      // The web font swapping in reflows the text above the anchor; land again once it has.
      void document.fonts?.ready.then(land)
      return
    }
    // Not on the first render: the browser's own focus is right for the first page.
    if (location.key === "default") return
    const target = document.getElementById("page-title") ?? document.getElementById("page")
    target?.focus({ preventScroll: false })
  }, [location])
}

function fragmentId(hash: string): string {
  try {
    return decodeURIComponent(hash.slice(1))
  } catch {
    return hash.slice(1)
  }
}
