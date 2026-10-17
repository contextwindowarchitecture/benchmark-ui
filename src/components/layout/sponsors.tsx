// The sponsor placements (AGENTS.md; the plan's chrome decisions): a logo is never beside a number
// and never in the sticky header. The hero and the sidebar show the presenting sponsors under a
// "Supported by" label; the footer shows every sponsor in a row. Each reads the one list in
// src/content/sponsors.ts through the sponsors context, and renders nothing for an empty list.

import { cn } from "cn"
import { useId, type CSSProperties } from "react"

import { orderedSponsors, sponsorPath, type Sponsor } from "@/content"

/** The website's muted label (its STYLE.md 4), as tokens.css gives card titles and column heads. */
export const sponsorLabelClass =
  "font-mono text-[11px] leading-[1.5] tracking-[0.12em] text-muted-foreground uppercase"

const IMAGE_CLASS =
  "block h-full w-auto max-w-full object-contain object-left opacity-0 motion-safe:transition-opacity group-hover/sponsor:opacity-100 group-focus-visible/sponsor:opacity-100 forced-colors:opacity-100"

/**
 * A sponsor's logo, linked to the site's redirect (`/go/<slug>`, counted by the server). At rest
 * it is the muted foreground's silhouette: the logo as a mask over currentColor, so it takes the
 * chrome's grey on either theme; on hover and focus the logo itself shows in colour. The image
 * carries the sponsor's name and so does the link, in so many words, so its name is the same
 * whichever theme's image is shown; the silhouette is hidden from assistive technology, and in
 * forced colours, where backgrounds go, the image shows alone. Two files per sponsor, one per
 * theme, chosen as the brand's are.
 */
export function SponsorLink({
  sponsor,
  logoClassName,
  className,
}: {
  sponsor: Sponsor
  /** The logo's box: its height, and a width where the logos line up in a column. */
  logoClassName: string
  className?: string
}) {
  const { logo } = sponsor
  const masks = {
    "--logo-light": `url("${logo.light}")`,
    "--logo-dark": `url("${logo.dark}")`,
  } as CSSProperties
  return (
    <a
      href={sponsorPath(sponsor)}
      rel="noreferrer"
      aria-label={sponsor.name}
      data-sponsor={sponsor.slug}
      className={cn(
        "group/sponsor inline-flex min-h-6 items-center text-muted-foreground",
        className,
      )}
    >
      <span className={cn("relative block", logoClassName)} style={masks}>
        <img
          src={logo.light}
          alt={sponsor.name}
          width={logo.width}
          height={logo.height}
          className={cn(IMAGE_CLASS, "dark:hidden")}
        />
        <img
          src={logo.dark}
          alt={sponsor.name}
          width={logo.width}
          height={logo.height}
          className={cn(IMAGE_CLASS, "hidden dark:block")}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-current mask-contain mask-left mask-no-repeat [mask-image:var(--logo-light)] motion-safe:transition-opacity group-hover/sponsor:opacity-0 group-focus-visible/sponsor:opacity-0 forced-colors:hidden dark:[mask-image:var(--logo-dark)]"
        />
      </span>
    </a>
  )
}

/** "Supported by" over the presenting sponsors' logos: the hero's slot and the sidebar's. */
export function SupportedBy({
  sponsors,
  placement,
  logoClassName,
  className,
}: {
  sponsors: readonly Sponsor[]
  placement: "hero" | "sidebar"
  logoClassName: string
  className?: string
}) {
  const id = useId()
  if (sponsors.length === 0) return null
  return (
    <div className={cn("flex flex-col gap-2", className)} data-sponsors={placement}>
      <p id={id} className={sponsorLabelClass}>
        Supported by
      </p>
      <ul aria-labelledby={id} className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {sponsors.map((sponsor) => (
          <li key={sponsor.slug} className="flex max-w-full">
            <SponsorLink sponsor={sponsor} logoClassName={logoClassName} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Every sponsor's logo in a row at the footer's scale: presenting first, then the partners. */
export function SponsorRow({ sponsors }: { sponsors: readonly Sponsor[] }) {
  if (sponsors.length === 0) return null
  return (
    <ul
      aria-label="Sponsors"
      data-sponsors="footer"
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      {orderedSponsors(sponsors).map((sponsor) => (
        <li key={sponsor.slug} className="flex">
          <SponsorLink sponsor={sponsor} logoClassName="h-4" />
        </li>
      ))}
    </ul>
  )
}
