# benchmark-ui

The results site of the CWA (Context Window Architecture) viability benchmark, at
https://benchmark.contextwindowarchitecture.io. It reads the runs the benchmark harness writes
([contextwindowarchitecture/benchmark](https://github.com/contextwindowarchitecture/benchmark)) and shows what each
domain of the benchmark establishes about CWA: the claim, the evidence, how far to trust it, and every number behind
it.

**Status: phases UI-P0 to UI-P3 and UI-P5 built** (the scaffold, the data layer, the shell, the runs list and the run
page; the deployment, serving at the host; the suite pages with their rows; coverage, the findings and the answer
explorer; the narrative layer: the home page, About, the Domain 1 overview over the composite latest, the not-started
domain pages, the four diagrams, the pipeline walk and compare). Performance and the shedding viewer (UI-P4) and the
polish pass (UI-P6) are later phases; their routes render a placeholder that names theirs. [DESIGN.md](DESIGN.md) is the front-end design baseline and
[docs/design/project-profile.md](docs/design/project-profile.md) records what this project chose. The working plan is
kept locally under `docs/plans/`, like the benchmark's own plans.

The benchmark's schemas, fixture runs and write-ups are vendored under `vendor/cwa-bench/` at the commit
`vendor/cwa-bench.lock.json` pins; results never are. The viewer's types are generated from those schemas and every
document is validated against them before it is shown.

## Working on it

```sh
pnpm install
pnpm dev                 # serves ../benchmark/domain1/results/d1 when it exists, else the vendored fixtures
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm vendor:check        # the vendored copy against the lock, and against ../benchmark at the locked commit
pnpm test:e2e            # the Playwright smoke test over `vite preview` and the fixtures
pnpm vendor ../benchmark # re-vendor from a checkout and move the pin (one commit, with `pnpm generate:types`)
```

Node 24 and pnpm 12 (`packageManager` in `package.json`). `VITE_RESULTS_DIR` points the dev server at another
results directory. The app reads its results root from `/config.json` at runtime (`public/config.json` locally).
