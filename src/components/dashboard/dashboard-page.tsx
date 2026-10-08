import { cn } from "cn"
import type { ReactNode } from "react"

/** DESIGN.md 4.4's page contract: one title, a description, actions, filters and a status region. */
export type DashboardPageProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
  filters?: ReactNode
  status?: ReactNode
  width?: "standard" | "wide"
  children: ReactNode
}

export function DashboardPage({
  title,
  description,
  actions,
  filters,
  status,
  width = "standard",
  children,
}: DashboardPageProps) {
  return (
    <div
      data-width={width}
      className={cn(
        "mx-auto flex w-full flex-col gap-6 p-4 md:p-6 lg:p-8",
        width === "standard" && "max-w-[90rem]",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1
            id="page-title"
            tabIndex={-1}
            className="text-2xl font-semibold tracking-tight outline-none"
          >
            {title}
          </h1>
          {description ? (
            <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
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
            className="text-lg font-semibold tracking-tight"
          >
            {title}
          </h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}
