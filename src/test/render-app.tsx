// Renders the app's routes in a memory router over the vendored fixtures, for page tests.

import { QueryClient } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"

import { AppProviders } from "@/App"
import { routes } from "@/app/routes"

import { FIXTURE_ROOT, fixtureFetch, type FixtureFetchOptions } from "./fixture-fetch"

export function renderApp(path: string, fetchOptions: FixtureFetchOptions = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const fetchFn = fixtureFetch(fetchOptions)
  // No retries in tests: a failed load is a state to assert on, not something to wait out.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <AppProviders
      config={{ resultsRoot: FIXTURE_ROOT }}
      fetchFn={fetchFn}
      queryClient={queryClient}
    >
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...view, router }
}
