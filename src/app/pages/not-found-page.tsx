import { Link } from "react-router"

import { DashboardPage } from "@/components/dashboard/dashboard-page"

export function NotFoundPage() {
  return (
    <DashboardPage title="Page not found" description="Nothing is at this address.">
      <p className="text-sm">
        <Link to="/" className="underline underline-offset-3">
          Go to the home page
        </Link>{" "}
        or{" "}
        <Link to="/d1/runs" className="underline underline-offset-3">
          browse the runs
        </Link>
        .
      </p>
    </DashboardPage>
  )
}
