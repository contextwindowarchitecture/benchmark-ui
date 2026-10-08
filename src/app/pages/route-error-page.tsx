import { isRouteErrorResponse, Link, useRouteError } from "react-router"

import { DashboardPage } from "@/components/dashboard/dashboard-page"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/** Rendered inside the shell when a page throws, so the navigation stays usable. */
export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error)
  return (
    <DashboardPage title="Something went wrong">
      <Alert variant="destructive">
        <AlertTitle>This page could not render</AlertTitle>
        <AlertDescription>
          <p className="font-mono text-xs">{message}</p>
          <p>
            <Link to="/" className="underline underline-offset-3">
              Go to the home page
            </Link>
            .
          </p>
        </AlertDescription>
      </Alert>
    </DashboardPage>
  )
}
