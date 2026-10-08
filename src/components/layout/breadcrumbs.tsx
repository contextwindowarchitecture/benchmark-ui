import { Fragment } from "react"
import { Link } from "react-router"

import type { Crumb } from "@/app/route-meta"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

/** Hierarchy, not history (DESIGN.md 4.3): Benchmark › Domain 1 › Runs › <run id>. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length === 0) return null
  return (
    <Breadcrumb aria-label="Breadcrumb">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <Fragment key={`${index}-${crumb.label}`}>
              <BreadcrumbItem
                className={index < crumbs.length - 2 ? "hidden md:inline-flex" : undefined}
              >
                {last || !crumb.to ? (
                  <BreadcrumbPage className="max-w-56 truncate">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {last ? null : (
                <BreadcrumbSeparator
                  className={index < crumbs.length - 2 ? "hidden md:inline-flex" : undefined}
                />
              )}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
