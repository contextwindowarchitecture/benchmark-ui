import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { createBrowserRouter, RouterProvider } from "react-router"

import { routes } from "./app/routes"
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert"
import { TooltipProvider } from "./components/ui/tooltip"
import { type AppConfig, CONFIG_URL, errorMessage, loadConfig } from "./data/config"
import { createQueryClient, ResultsSourceContext } from "./data/queries"
import { createResultsSource } from "./data/source"
import { ThemeProvider } from "./lib/theme"

type ConfigState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; config: AppConfig }

/** Every provider a page needs, given the runtime configuration; tests supply their own source. */
export function AppProviders({
  config,
  children,
  fetchFn,
  queryClient: givenClient,
}: {
  config: AppConfig
  children: ReactNode
  fetchFn?: typeof fetch
  queryClient?: QueryClient
}) {
  const source = useMemo(
    () => createResultsSource(config.resultsRoot, fetchFn),
    [config.resultsRoot, fetchFn],
  )
  const queryClient = useMemo(() => givenClient ?? createQueryClient(), [givenClient])
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ResultsSourceContext.Provider value={source}>
          <TooltipProvider>{children}</TooltipProvider>
        </ResultsSourceContext.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

/** Loads /config.json first (DESIGN.md 6.4); a missing or invalid document is a visible error. */
export function App() {
  const [state, setState] = useState<ConfigState>({ status: "loading" })
  useEffect(() => {
    let cancelled = false
    loadConfig()
      .then((config) => !cancelled && setState({ status: "ready", config }))
      .catch(
        (error: unknown) =>
          !cancelled && setState({ status: "error", message: errorMessage(error) }),
      )
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === "loading") {
    return (
      <p role="status" className="p-6 text-sm text-muted-foreground">
        Loading configuration…
      </p>
    )
  }
  if (state.status === "error") {
    return (
      <main id="main-content" className="mx-auto max-w-xl p-6">
        <Alert variant="destructive">
          <AlertTitle>This site is not configured</AlertTitle>
          <AlertDescription>
            <p>
              <span className="font-mono">{CONFIG_URL}</span> must name the results root, for
              example <span className="font-mono">{'{ "resultsRoot": "/results" }'}</span>.
            </p>
            <p className="font-mono text-xs">{state.message}</p>
          </AlertDescription>
        </Alert>
      </main>
    )
  }
  return (
    <AppProviders config={state.config}>
      <Router />
    </AppProviders>
  )
}

function Router() {
  const router = useMemo(() => createBrowserRouter(routes), [])
  return <RouterProvider router={router} />
}
