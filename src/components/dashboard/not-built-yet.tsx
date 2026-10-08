import { Construction } from "lucide-react"
import { Link } from "react-router"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { DashboardPage } from "./dashboard-page"

/** A clean placeholder for a route a later phase builds (ui-plan.md 15), inside the shell. */
export function NotBuiltYet({
  title,
  phase,
  note,
}: {
  title: string
  phase: string
  note?: string
}) {
  return (
    <DashboardPage title={title}>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction aria-hidden="true" className="size-4" /> Not built yet
          </CardTitle>
          <CardDescription>
            This page is phase {phase} of the plan. {note}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <Link to="/d1/runs" className="underline underline-offset-3">
            Browse the runs
          </Link>{" "}
          in the meantime.
        </CardContent>
      </Card>
    </DashboardPage>
  )
}
