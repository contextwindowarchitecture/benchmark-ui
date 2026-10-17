// The sponsor placements (AGENTS.md; the plan's chrome decisions): a logo is never beside a number
// and never in the sticky header. The hero and the sidebar show the headline sponsors under a
// "Supported by" label, and the footer shows them in a row; every sponsor has a card on the
// Sponsors page. Each reads the one list in src/content/sponsors.ts through the sponsors context,
// and renders nothing for an empty list.

import { cn } from "cn"
import { useId, type CSSProperties } from "react"

import { sponsorPath, type Sponsor } from "@/content"

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

/** "Supported by" over the headline sponsors' logos: the hero's slot and the sidebar's. */
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

/** The headline sponsors' logos in a row at the footer's scale; the rest are on the Sponsors page. */
export function SponsorRow({ sponsors }: { sponsors: readonly Sponsor[] }) {
  if (sponsors.length === 0) return null
  return (
    <ul
      aria-label="Sponsors"
      data-sponsors="footer"
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      {sponsors.map((sponsor) => (
        <li key={sponsor.slug} className="flex">
          <SponsorLink sponsor={sponsor} logoClassName="h-4" />
        </li>
      ))}
    </ul>
  )
}

/**
 * A sponsor's logo in its own colours, one image per theme: the Sponsors page's card and dialog,
 * where the logo is the subject rather than the chrome's. The name is beside it in words, so the
 * images are decorative unless `alt` says otherwise.
 */
export function SponsorLogo({
  sponsor,
  className,
  alt = "",
}: {
  sponsor: Sponsor
  /** The logo's box: its height. */
  className: string
  alt?: string
}) {
  const { logo } = sponsor
  const image = "block h-full w-auto max-w-full object-contain object-left"
  return (
    <span className={cn("flex", className)} data-sponsor-logo={sponsor.slug}>
      <img
        src={logo.light}
        alt={alt}
        width={logo.width}
        height={logo.height}
        className={cn(image, "dark:hidden")}
      />
      <img
        src={logo.dark}
        alt={alt}
        width={logo.width}
        height={logo.height}
        className={cn(image, "hidden dark:block")}
      />
    </span>
  )
}
