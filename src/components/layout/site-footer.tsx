import { Link } from "react-router"

import { headlineSponsors } from "@/content"
import { buildInfo } from "@/lib/build-info"
import { CWA_SITE, ORGANISATION } from "@/lib/sites"
import { useSponsors } from "@/lib/sponsors-context"

import { SponsorRow } from "./sponsors"

/**
 * The website's footer: a hairline above, mono 12px muted. Left, what this build reads and was
 * built from; right, the headline sponsors' logos when there are any, the link to the Sponsors page
 * when there is any sponsor, then the way back to CWA.
 */
export function SiteFooter() {
  const sponsors = useSponsors()
  const headline = headlineSponsors(sponsors)
  const nav = (
    <nav aria-label="Footer" className="flex flex-wrap gap-5">
      <Link to="/about" className="hover:text-foreground">
        About
      </Link>
      {sponsors.length > 0 ? (
        <Link to="/sponsors" className="hover:text-foreground">
          Sponsors
        </Link>
      ) : null}
      <a href={CWA_SITE} className="hover:text-foreground">
        contextwindowarchitecture.io
      </a>
      <a href={ORGANISATION} className="hover:text-foreground">
        GitHub
      </a>
    </nav>
  )
  return (
    <footer className="mt-auto border-t">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-8 font-mono text-[12px] leading-[1.65] text-muted-foreground md:px-6 lg:px-8">
        <p>
          Reads {buildInfo.producers.join(", ")} v1 · benchmark{" "}
          <span title={buildInfo.benchmarkCommit}>{buildInfo.benchmarkCommit.slice(0, 7)}</span> ·
          ui {buildInfo.uiCommit}
        </p>
        {headline.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <SponsorRow sponsors={headline} />
            {nav}
          </div>
        ) : (
          nav
        )}
      </div>
    </footer>
  )
}
