// The Sponsors page (the plan's chrome decisions): every sponsor and partner as a card, by tier,
// where the hero, the sidebar and the footer hold the headline sponsors only. A card opens a
// dialog on the detail of what the sponsor funds and the link to them, through the site's
// redirect. The disclosure and the invitation follow; with no sponsor, the invitation alone.

import { ChevronRight, ExternalLink } from "lucide-react"
import { useId } from "react"

import { DashboardPage, PageSection } from "@/components/dashboard/dashboard-page"
import { SponsorLogo, sponsorLabelClass } from "@/components/layout/sponsors"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  CONTENT_SOURCE,
  orderedSponsors,
  sponsorPath,
  SPONSORS_DISCLOSURE,
  SPONSORS_PAGE,
  SPONSORSHIP_REQUEST,
  TIER_HEADINGS,
  TIER_WORDS,
  TIERS,
  type Sponsor,
} from "@/content"
import { useSponsors } from "@/lib/sponsors-context"

function Out({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      rel="noreferrer"
      className="inline-flex items-center gap-1 underline underline-offset-3"
    >
      {children}
      <ExternalLink aria-hidden="true" className="size-3" />
    </a>
  )
}

export function SponsorsPage() {
  const sponsors = orderedSponsors(useSponsors())
  const tiers = TIERS.map((tier) => ({
    tier,
    sponsors: sponsors.filter((sponsor) => sponsor.tier === tier),
  })).filter((group) => group.sponsors.length > 0)
  return (
    <DashboardPage variant="narrative" title="Sponsors" description={SPONSORS_PAGE.description}>
      {tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-state="empty">
          {SPONSORS_PAGE.empty}
        </p>
      ) : (
        tiers.map((group) => (
          <PageSection key={group.tier} id={group.tier} title={TIER_HEADINGS[group.tier]}>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-sponsors="page">
              {group.sponsors.map((sponsor) => (
                <li key={sponsor.slug} data-sponsor={sponsor.slug} className="flex">
                  <SponsorCard sponsor={sponsor} />
                </li>
              ))}
            </ul>
          </PageSection>
        ))
      )}

      {tiers.length > 0 ? (
        <PageSection id="disclosure" title="What sponsors do not do">
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {SPONSORS_DISCLOSURE.join(" ")}{" "}
            <Out
              href={`https://github.com/${CONTENT_SOURCE.repository}/tree/${CONTENT_SOURCE.commit}`}
            >
              The repository at that commit
            </Out>
          </p>
        </PageSection>
      ) : null}

      <PageSection id="become" title="Become a sponsor">
        <div className="max-w-prose space-y-3 text-sm leading-relaxed">
          {SPONSORS_PAGE.become.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p>
            <Out href={SPONSORSHIP_REQUEST}>{SPONSORS_PAGE.becomeLink}</Out>
          </p>
        </div>
      </PageSection>
    </DashboardPage>
  )
}

/**
 * A sponsor's card: the logo in its colours, the name, the tier and the role. The whole card is
 * the trigger of its own dialog, so the primitive gives the focus back to it on close; whether
 * the dialog is open is the card's state (DESIGN.md 6.1), not the URL's. Its name is the
 * sponsor's, its description the role.
 */
function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const id = useId()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-labelledby={`${id}-name`}
          aria-describedby={`${id}-role`}
          className="group/card flex w-full flex-col gap-4 border bg-card p-5 text-left outline-none hover:border-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:transition-colors"
        >
          <SponsorLogo sponsor={sponsor} className="h-10" />
          <span className="flex flex-col gap-1">
            <span className={sponsorLabelClass}>{TIER_WORDS[sponsor.tier]}</span>
            <span id={`${id}-name`} className="text-base font-medium">
              {sponsor.name}
            </span>
            <span id={`${id}-role`} className="text-sm text-muted-foreground">
              {sponsor.role}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="mt-auto inline-flex items-center gap-1 font-mono text-[12px] text-muted-foreground group-hover/card:text-foreground"
          >
            Details
            <ChevronRight className="size-3.5" />
          </span>
        </button>
      </DialogTrigger>
      <SponsorDialog sponsor={sponsor} />
    </Dialog>
  )
}

/** The detail of one sponsorship: the logo, the tier, the role, its paragraphs and the link. */
function SponsorDialog({ sponsor }: { sponsor: Sponsor }) {
  return (
    <DialogContent className="sm:max-w-lg" data-sponsor={sponsor.slug}>
      <DialogHeader className="gap-3">
        <SponsorLogo sponsor={sponsor} className="h-10" />
        <p className={sponsorLabelClass}>{TIER_WORDS[sponsor.tier]}</p>
        <DialogTitle className="text-lg">{sponsor.name}</DialogTitle>
        <DialogDescription>{sponsor.role}</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 text-sm leading-relaxed">
        {sponsor.details.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <DialogFooter>
        <Button asChild variant="outline">
          <a href={sponsorPath(sponsor)} rel="noreferrer">
            {sponsor.linkText ?? `Visit ${sponsor.name}`}
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
