import { cn } from "cn"
import { useEffect, useRef, type ReactNode } from "react"
import { useLocation } from "react-router"

import { navGroupOf } from "@/app/navigation"

import { takeTitleFocus } from "./title-focus"

/** DESIGN.md 4.4's page contract: one title, a description, actions, filters and a status region. */
export type DashboardPageProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
  filters?: ReactNode
  status?: ReactNode
  width?: "standard" | "wide"
  /**
   * A narrative page (DESIGN.md 4.5) opens as the website's pages do, with a display title and a
   * lede; a dashboard page keeps a compact title over its data.
   */
  variant?: "dashboard" | "narrative"
  /**
   * The mono line above the title. By default the sidebar group the page belongs to ("Domain 1 ·
   * Assembly"); null leaves it out where the title already says it.
   */
  kicker?: string | null
  children: ReactNode
}

export function DashboardPage({
  title,
  description,
  actions,
  filters,
  status,
  width = "standard",
  variant = "dashboard",
  kicker,
  children,
}: DashboardPageProps) {
  const { pathname } = useLocation()
  const kickerText = kicker === undefined ? navGroupOf(pathname)?.label : kicker
  const narrative = variant === "narrative"
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (!takeTitleFocus()) return
    const active = document.activeElement
    if (!active || active === document.body) titleRef.current?.focus({ preventScroll: true })
  }, [])
  return (
    <div
      data-width={width}
      className={cn(
        "mx-auto flex w-full flex-col gap-6 p-4 md:p-6 lg:p-8",
        width === "standard" && "max-w-[90rem]",
      )}
    >
      <header
        data-variant={variant}
        className={cn(
          "flex flex-wrap items-start justify-between gap-4",
          narrative && "pt-4 pb-2 md:pt-8",
        )}
      >
        <div className="min-w-0">
          {kickerText ? (
            <p
              data-kicker
              className={cn(
                "font-mono text-[12px] tracking-[0.14em] text-primary uppercase",
                narrative ? "mb-5" : "mb-3",
              )}
            >
              {kickerText}
            </p>
          ) : null}
          <h1
            ref={titleRef}
            id="page-title"
            tabIndex={-1}
            className={cn(
              "font-bold text-balance outline-none",
              narrative
                ? "max-w-[24ch] text-[clamp(34px,4.4vw,56px)] leading-[0.98] tracking-[-0.045em]"
                : "text-[clamp(26px,2.6vw,34px)] leading-[1.05] tracking-[-0.035em]",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                "text-pretty text-muted-foreground",
                narrative
                  ? "mt-5 max-w-[64ch] text-[18px] leading-[1.6]"
                  : "mt-2 max-w-[70ch] text-[15px] leading-[1.55]",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </header>
      {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      {status ? <div>{status}</div> : null}
      {children}
    </div>
  )
}

/** A titled region of a page: a section with its own heading. */
export function PageSection({
  title,
  description,
  actions,
  children,
  id,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  id?: string
}) {
  return (
    <section
      aria-labelledby={id ? `${id}-heading` : undefined}
      id={id}
      className="min-w-0 space-y-3"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id={id ? `${id}-heading` : undefined}
            className="text-[22px] leading-[1.2] font-semibold tracking-[-0.02em] text-pretty"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-[70ch] text-[14.5px] leading-[1.55] text-pretty text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex max-w-full min-w-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  )
}
