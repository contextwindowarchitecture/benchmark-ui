// The routes of ui-plan.md 6.2, exactly. Later phases' routes render a placeholder inside the
// shell rather than a 404, so every link in the plan resolves from day one.

import { Suspense } from "react"
import type { RouteObject } from "react-router"

import { NotBuiltYet } from "@/components/dashboard/not-built-yet"
import { PageFallback } from "@/components/dashboard/page-fallback"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { RunPage } from "@/features/d1/components/run-page"
import { AnswerPage } from "@/features/d1/components/answer-page"
import { ComparePage } from "@/features/d1/components/compare-page"
import { CoveragePage } from "@/features/d1/components/coverage-page"
import { FindingPage } from "@/features/d1/components/finding-page"
import { FindingsPage } from "@/features/d1/components/findings-page"
import { RunsPage } from "@/features/d1/components/runs-page"
import { SuitePage } from "@/features/d1/components/suite-page"

import { AboutPage } from "./pages/about-page"
import { DomainPage } from "./pages/domain-page"
import { GlossaryPage } from "./pages/glossary-page"
import { HomePage } from "./pages/home-page"
import { OverviewPage } from "./pages/lazy-pages"
import { NotFoundPage } from "./pages/not-found-page"
import { RouteErrorPage } from "./pages/route-error-page"
import type { RouteHandle } from "./route-meta"

const handle = (h: RouteHandle): RouteHandle => h

const param = (params: Record<string, string | undefined>, name: string) => params[name] ?? ""

const DOMAINS: Record<string, string> = {
  d2: "Domain 2 · Long-horizon stability",
  d3: "Domain 3 · Agentic capability",
  d4: "Domain 4 · Economics and caching",
  d5: "Domain 5 · Hierarchy and security",
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <DashboardShell />,
    handle: handle({
      title: () => "CWA benchmark",
      crumb: () => ({ label: "Benchmark", to: "/" }),
    }),
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <HomePage />, handle: handle({ title: () => "CWA benchmark" }) },
          {
            path: "about",
            element: <AboutPage />,
            handle: handle({ title: () => "About", crumb: () => ({ label: "About" }) }),
          },
          {
            path: "glossary",
            element: <GlossaryPage />,
            handle: handle({ title: () => "Glossary", crumb: () => ({ label: "Glossary" }) }),
          },
          {
            path: "d1",
            handle: handle({
              title: () => "Domain 1",
              crumb: () => ({ label: "Domain 1", to: "/d1" }),
            }),
            children: [
              {
                index: true,
                element: (
                  <Suspense
                    fallback={
                      <PageFallback
                        title="Domain 1 · Assembly determinism, budgeting and traceability"
                        width="wide"
                      />
                    }
                  >
                    <OverviewPage />
                  </Suspense>
                ),
                handle: handle({ title: () => "Domain 1 overview" }),
              },
              {
                path: "runs",
                handle: handle({
                  title: () => "Runs",
                  crumb: () => ({ label: "Runs", to: "/d1/runs" }),
                }),
                children: [
                  { index: true, element: <RunsPage />, handle: handle({ title: () => "Runs" }) },
                  {
                    path: ":runId",
                    handle: handle({
                      title: () => "Run",
                      crumb: (p) => ({
                        label: param(p, "runId"),
                        to: `/d1/runs/${param(p, "runId")}`,
                      }),
                    }),
                    children: [
                      { index: true, element: <RunPage />, handle: handle({ title: () => "Run" }) },
                      {
                        path: "suites/:suite",
                        element: <SuitePage />,
                        handle: handle({
                          title: (p) => param(p, "suite"),
                          crumb: (p) => ({ label: param(p, "suite") }),
                        }),
                      },
                      {
                        path: "coverage",
                        element: <CoveragePage />,
                        handle: handle({
                          title: () => "Coverage",
                          crumb: () => ({ label: "Coverage" }),
                        }),
                      },
                      {
                        path: "findings",
                        handle: handle({
                          title: () => "Findings",
                          crumb: (p) => ({
                            label: "Findings",
                            to: `/d1/runs/${param(p, "runId")}/findings`,
                          }),
                        }),
                        children: [
                          {
                            index: true,
                            element: <FindingsPage />,
                            handle: handle({ title: () => "Findings" }),
                          },
                          {
                            path: ":findingId",
                            element: <FindingPage />,
                            handle: handle({
                              title: (p) => `Finding ${param(p, "findingId")}`,
                              crumb: (p) => ({ label: param(p, "findingId") }),
                            }),
                          },
                        ],
                      },
                      {
                        path: "perf",
                        element: (
                          <NotBuiltYet
                            title="Performance"
                            phase="UI-P4"
                            note="S7's startup, scaling fits, throughput and time to refusal."
                          />
                        ),
                        handle: handle({
                          title: () => "Performance",
                          crumb: () => ({ label: "Performance" }),
                        }),
                      },
                      {
                        path: "sweeps",
                        handle: handle({
                          title: () => "Sweeps",
                          crumb: (p) => ({
                            label: "Shedding",
                            to: `/d1/runs/${param(p, "runId")}/sweeps`,
                          }),
                        }),
                        children: [
                          {
                            index: true,
                            element: (
                              <NotBuiltYet
                                title="Shedding"
                                phase="UI-P4"
                                note="The sweep cells of this run."
                              />
                            ),
                            handle: handle({ title: () => "Shedding" }),
                          },
                          {
                            path: ":digest",
                            element: (
                              <NotBuiltYet
                                title="Shedding viewer"
                                phase="UI-P4"
                                note="A budget sweep replayed frame by frame."
                              />
                            ),
                            handle: handle({
                              title: (p) => `Sweep ${param(p, "digest").slice(0, 7)}`,
                              crumb: (p) => ({ label: param(p, "digest").slice(0, 7) }),
                            }),
                          },
                        ],
                      },
                      {
                        path: "answers/:suite/:caseId",
                        element: <AnswerPage />,
                        handle: handle({
                          title: (p) => `${param(p, "suite")} ${param(p, "caseId")}`,
                          crumb: (p) => ({ label: `${param(p, "suite")} · ${param(p, "caseId")}` }),
                        }),
                      },
                    ],
                  },
                ],
              },
              {
                path: "compare",
                element: <ComparePage />,
                handle: handle({ title: () => "Compare", crumb: () => ({ label: "Compare" }) }),
              },
            ],
          },
          ...Object.entries(DOMAINS).map(([id, title]): RouteObject => ({
            path: id,
            element: <DomainPage id={id} />,
            handle: handle({ title: () => title, crumb: () => ({ label: title }) }),
          })),
          { path: "*", element: <NotFoundPage />, handle: handle({ title: () => "Not found" }) },
        ],
      },
    ],
  },
]
