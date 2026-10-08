import { useParams } from "react-router"

import { DashboardPage } from "@/components/dashboard/dashboard-page"

export function RunPage() {
  const { runId } = useParams()
  return <DashboardPage title={runId ?? "Run"}>{null}</DashboardPage>
}
