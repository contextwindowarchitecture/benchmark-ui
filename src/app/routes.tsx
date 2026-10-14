// The routes of ui-plan.md 6.2, exactly. Every link in the plan resolves to a built page.

import { Suspense } from "react"
import type { RouteObject } from "react-router"

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
import { SweepsPage } from "@/features/d1/components/sweeps/sweeps-page"
import { D2RunPage } from "@/features/d2/components/run-page"
import { D2SuitePage } from "@/features/d2/components/suite-page"
import { D5RunPage } from "@/features/d5/components/run-page"
import { D5SuitePage } from "@/features/d5/components/suite-page"

import { AboutPage } from "./pages/about-page"
import { DomainPage } from "./pages/domain-page"
import { GlossaryPage } from "./pages/glossary-page"
import { HomePage } from "./pages/home-page"
import {
  D2CostPage,
  D2InstructionsPage,
  D2LongContextPage,
  D2OverviewPage,
  D2TrackingPage,
  D5OverviewPage,
  D5StructurePage,
  D5AttacksPage,
  D5UtilityPage,
  D5AdaptivePage,
  D5ExternalPage,
  D5PastedPage,
  D5PersistencePage,
  OverviewPage,
  PerfPage,
  ViewerPage,
} from "./pages/lazy-pages"
import { NotFoundPage } from "./pages/not-found-page"
import { RouteErrorPage } from "./pages/route-error-page"
import type { RouteHandle } from "./route-meta"

const handle = (h: RouteHandle): RouteHandle => h

const param = (params: Record<string, string | undefined>, name: string) => params[name] ?? ""

const DOMAINS: Record<string, string> = {
  d3: "Domain 3 · Agentic capability",
  d4: "Domain 4 · Economics and caching",
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
                          <Suspense fallback={<PageFallback title="Performance" width="wide" />}>
                            <PerfPage />
                          </Suspense>
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
                            element: <SweepsPage />,
                            handle: handle({ title: () => "Shedding" }),
                          },
                          {
                            path: ":digest",
                            element: (
                              <Suspense
                                fallback={<PageFallback title="Shedding viewer" width="wide" />}
                              >
                                <ViewerPage />
                              </Suspense>
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
          {
            path: "d2",
            handle: handle({
              title: () => "Domain 2",
              crumb: () => ({ label: "Domain 2", to: "/d2" }),
            }),
            children: [
              {
                index: true,
                element: (
                  <Suspense
                    fallback={
                      <PageFallback
                        title="Domain 2 · Long-horizon multi-turn stability and context drift"
                        width="wide"
                      />
                    }
                  >
                    <D2OverviewPage />
                  </Suspense>
                ),
                handle: handle({ title: () => "Domain 2 overview" }),
              },
              {
                path: "tracking",
                element: (
                  <Suspense fallback={<PageFallback title="Variable Tracking" width="wide" />}>
                    <D2TrackingPage />
                  </Suspense>
                ),
                handle: handle({
                  title: () => "Variable Tracking",
                  crumb: () => ({ label: "Variable Tracking" }),
                }),
              },
              {
                path: "instructions",
                element: (
                  <Suspense
                    fallback={<PageFallback title="Instruction persistence" width="wide" />}
                  >
                    <D2InstructionsPage />
                  </Suspense>
                ),
                handle: handle({
                  title: () => "Instruction persistence",
                  crumb: () => ({ label: "Instruction persistence" }),
                }),
              },
              {
                path: "long-context",
                element: (
                  <Suspense fallback={<PageFallback title="Long Context" width="wide" />}>
                    <D2LongContextPage />
                  </Suspense>
                ),
                handle: handle({
                  title: () => "Long Context",
                  crumb: () => ({ label: "Long Context" }),
                }),
              },
              {
                path: "cost",
                element: (
                  <Suspense fallback={<PageFallback title="Cost" width="wide" />}>
                    <D2CostPage />
                  </Suspense>
                ),
                handle: handle({ title: () => "Cost", crumb: () => ({ label: "Cost" }) }),
              },
              {
                path: "runs",
                handle: handle({
                  title: () => "Runs",
                  crumb: () => ({ label: "Runs", to: "/d2/runs" }),
                }),
                children: [
                  { index: true, element: <RunsPage />, handle: handle({ title: () => "Runs" }) },
                  {
                    path: ":runId",
                    handle: handle({
                      title: () => "Run",
                      crumb: (p) => ({
                        label: param(p, "runId"),
                        to: `/d2/runs/${param(p, "runId")}`,
                      }),
                    }),
                    children: [
                      {
                        index: true,
                        element: <D2RunPage />,
                        handle: handle({ title: () => "Run" }),
                      },
                      {
                        path: "suites/:suite",
                        element: <D2SuitePage />,
                        handle: handle({
                          title: (p) => param(p, "suite"),
                          crumb: (p) => ({ label: param(p, "suite") }),
                        }),
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            path: "d5",
            handle: handle({
              title: () => "Domain 5",
              crumb: () => ({ label: "Domain 5", to: "/d5" }),
            }),
            children: [
              {
                index: true,
                element: (
                  <Suspense
                    fallback={
                      <PageFallback
                        title="Domain 5 · Instruction hierarchy, security and indirect prompt injection"
                        width="wide"
                      />
                    }
                  >
                    <D5OverviewPage />
                  </Suspense>
                ),
                handle: handle({ title: () => "Domain 5 overview" }),
              },
              {
                path: "structure",
                element: (
                  <Suspense fallback={<PageFallback title="Structural Isolation" width="wide" />}>
                    <D5StructurePage />
                  </Suspense>
                ),
                handle: handle({
                  title: () => "Structural Isolation",
                  crumb: () => ({ label: "Structural Isolation" }),
                }),
              },
              {
                path: "attacks",
                element: (
                  <Suspense fallback={<PageFallback title="Attacks" width="wide" />}>
                    <D5AttacksPage />
                  </Suspense>
                ),
                handle: handle({ title: () => "Attacks", crumb: () => ({ label: "Attacks" }) }),
              },
              {
                path: "utility",
                element: (
                  <Suspense fallback={<PageFallback title="Utility" width="wide" />}>
                    <D5UtilityPage />
                  </Suspense>
                ),
                handle: handle({ title: () => "Utility", crumb: () => ({ label: "Utility" }) }),
              },
              {
                path: "adaptive",
                element: (
                  <Suspense fallback={<PageFallback title="Adaptive Attacker" width="wide" />}>
                    <D5AdaptivePage />
                  </Suspense>
                ),
                handle: handle({
                  title: () => "Adaptive Attacker",
                  crumb: () => ({ label: "Adaptive Attacker" }),
                }),
              },
              {
                path: "external",
                element: (
                  <Suspense fallback={<PageFallback title="External Sets" width="wide" />}>
                    <D5ExternalPage />
                  </Suspense>
                ),
                handle: handle({
                  title: () => "External Sets",
                  crumb: () => ({ label: "External Sets" }),
                }),
              },
              {
                path: "pasted",
                element: (
                  <Suspense fallback={<PageFallback title="Pasted Material" width="wide" />}>
                    <D5PastedPage />
                  </Suspense>
                ),
                handle: handle({
                  title: () => "Pasted Material",
                  crumb: () => ({ label: "Pasted Material" }),
                }),
              },
              {
                path: "persistence",
                element: (
                  <Suspense fallback={<PageFallback title="Persistence" width="wide" />}>
                    <D5PersistencePage />
                  </Suspense>
                ),
                handle: handle({
                  title: () => "Persistence",
                  crumb: () => ({ label: "Persistence" }),
                }),
              },
              {
                path: "runs",
                handle: handle({
                  title: () => "Runs",
                  crumb: () => ({ label: "Runs", to: "/d5/runs" }),
                }),
                children: [
                  { index: true, element: <RunsPage />, handle: handle({ title: () => "Runs" }) },
                  {
                    path: ":runId",
                    handle: handle({
                      title: () => "Run",
                      crumb: (p) => ({
                        label: param(p, "runId"),
                        to: `/d5/runs/${param(p, "runId")}`,
                      }),
                    }),
                    children: [
                      {
                        index: true,
                        element: <D5RunPage />,
                        handle: handle({ title: () => "Run" }),
                      },
                      {
                        path: "suites/:suite",
                        element: <D5SuitePage />,
                        handle: handle({
                          title: (p) => param(p, "suite"),
                          crumb: (p) => ({ label: param(p, "suite") }),
                        }),
                      },
                    ],
                  },
                ],
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
