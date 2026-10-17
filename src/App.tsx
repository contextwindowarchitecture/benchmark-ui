import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { createBrowserRouter, RouterProvider } from "react-router"

import { routes } from "./app/routes"
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert"
import { TooltipProvider } from "./components/ui/tooltip"
import { type AppConfig, CONFIG_URL, errorMessage, loadConfig } from "./data/config"
import { createQueryClient, ResultsSourcesContext, type ResultsSources } from "./data/queries"
import { createResultsSource, type ResultsDomain, type ResultsSource } from "./data/source"
import type { Sponsor } from "./content"
import { SponsorsContext } from "./lib/sponsors-context"
import { ThemeProvider } from "./lib/theme"

type ConfigState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; config: AppConfig }

/**
 * Every provider a page needs, given the runtime configuration; tests supply their own source,
 * and a sponsors list in place of the content file's.
 */
export function AppProviders({
  config,
  children,
  fetchFn,
  queryClient: givenClient,
  sponsors,
}: {
  config: AppConfig
  children: ReactNode
  fetchFn?: typeof fetch
  queryClient?: QueryClient
  sponsors?: readonly Sponsor[]
}) {
  const sources = useMemo<ResultsSources>(() => {
    const built = new Map<ResultsDomain, ResultsSource>()
    return {
      forDomain(domain) {
        let source = built.get(domain)
        if (!source) {
          source = createResultsSource(config.resultsRoot, fetchFn, domain)
          built.set(domain, source)
        }
        return source
      },
    }
  }, [config.resultsRoot, fetchFn])
  const queryClient = useMemo(() => givenClient ?? createQueryClient(), [givenClient])
  const providers = (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ResultsSourcesContext.Provider value={sources}>
          <TooltipProvider>{children}</TooltipProvider>
        </ResultsSourcesContext.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  )
  return sponsors ? (
    <SponsorsContext.Provider value={sponsors}>{providers}</SponsorsContext.Provider>
  ) : (
    providers
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
