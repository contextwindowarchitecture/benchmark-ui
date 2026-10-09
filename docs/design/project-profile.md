# Project design profile

The profile DESIGN.md section 15 asks for, moved here from the plan's section 13 when phase UI-P0 started
(2026-10-08) and filled in with what was actually chosen. Every line names the section of DESIGN.md or of the
plan (`docs/plans/ui-plan.md`, local) it answers to.

- Baseline revision: DESIGN.md 1.3
- Repository: `contextwindowarchitecture/benchmark-ui`, vendoring the benchmark by copy at a pinned commit (the
  plan's 3.1): `vendor/cwa-bench/` holds the 29 v1 schemas, the three fixture runs and the two write-ups; the lock
  `vendor/cwa-bench.lock.json` pins commit `603fe20` of `contextwindowarchitecture/benchmark`. `pnpm vendor
  ../benchmark` re-vendors; `pnpm vendor:check` fails on drift between the lock, the copy and the checkout at the
  locked commit. Never edit a vendored file; move the pin in one commit with the regenerated types.
- Application type and primary user tasks: a public, read-only results site for the benchmark; the plan's section 1.
- Framework and routing strategy: Vite 8.3.3 with `@vitejs/plugin-react` 6.1.2, React 19.3.0, React Router 8.4.0 in
  data mode (`createBrowserRouter`; route `handle`s carry the page title and the breadcrumb); client-side only, no
  server rendering. The routes are the plan's 6.2; pages of later phases render a placeholder inside the shell.
- Runtime and package-manager versions: Node 24 (`engines.node >= 24`, developed on 24.20.0), pnpm 12.3.4 pinned
  through `packageManager`, exact versions in `package.json` and `pnpm-lock.yaml`. TypeScript 6.0.3 (not 7: the
  typescript-eslint release in use supports versions below 6.1).
- shadcn preset / component primitive implementation: shadcn 4.21.4, preset `nova` on the Radix base
  (`style: "radix-nova"` in `components.json`), base color neutral, CSS variables, `tw-animate-css`, Lucide icons.
  One preset, no mixing. Generated primitives in `src/components/ui/` are kept as generated: ESLint exempts them
  from the two rules they trip, Prettier ignores them. Components generated at UI-P0: sidebar, breadcrumb,
  dropdown-menu, select, sheet, tooltip, button, badge, card, table, alert, input, separator, skeleton.
- Tailwind major version and theme source: Tailwind 4.3.3 through `@tailwindcss/vite`; the generated stylesheet is
  `src/styles/globals.css` and `src/styles/tokens.css` extends it (DESIGN.md 5): success, warning, info and
  failure pairs (failure is the status hue for fail, error and regressed; the generated destructive, tuned for
  white text on a button, stays the buttons' and reads below 4.5:1 as small text on a tint), the status vocabulary
  mapped onto the semantic pairs (`--status-*`), the four adapter identities on `--chart-1` to `--chart-4`
  (`--adapter-python`, `-typescript`, `-go`, `-rust`), and the motion tokens. The preset's grey chart tokens are
  replaced by the adapter hues; status colors are never used for series. Every status badge meets WCAG AA on its
  tint in the light theme (axe checks it in the smoke test).
- Remote data ownership and cache policy: TanStack Query 5.104.1 over the `ResultsSource` adapter
  (`src/data/source.ts`, DESIGN.md 6.4). Everything under a run id is cached for the session (`staleTime` and
  `gcTime` infinite); the runs index refetches on window focus and on the Refresh action. A 404 is a state (pruned,
  not in this run), never retried. Query keys carry the results root, the run id and the path.
- Data source and publishing: the client reads `/config.json` (`{ "resultsRoot": "/results" }`) at startup
  (`src/data/config.ts`); a missing or malformed document is a visible error, never a default. In `vite dev` and
  `vite preview` a plugin (`dev/results-plugin.ts`) serves `/results/d1/` from `../benchmark/domain1/results/d1`
  when that checkout is beside this repository, else from the vendored fixtures, with `VITE_RESULTS_DIR` overriding
  both; JSON and JSONL get their media types, misses 404, no listing. Deployed, the same build serves `/results/`
  from a volume published to by `deploy/publish.sh` (`deploy/`, the plan's section 12).
- Row and file-size budgets (6.4): `src/data/budgets.ts`, from the plan's 5.4: 5,000 rows on the main thread,
  30,000 in the worker, 30 MB loaded whole, 1 MB for an inline blob view, 4 points for a fit. UI-P0 ships the
  streaming JSONL parser and the budget check (`rows()` refuses a file the run index says is above the budget, and
  stops at the budget while streaming). Above the main-thread budget, `src/data/rows.worker.ts` fetches, parses and
  validates the file and keeps its rows, answering filtered pages and facet counts (`src/data/row-store.ts`, the
  same code on both sides), so the main thread never holds such a file; above the worker's budget the file is a
  download. Pages are a hundred rows; the facets stand in for pre-aggregation until a view needs more. The blob
  index (`blobs/index.jsonl`, 9,605 rows in a nightly) goes the same way, so a blob resolves to its path, media
  type and size through the worker; a blob above the 1 MB inline budget is a download. A trace is diffed against
  its expected trace by lines, bounded at four million comparisons (`src/lib/line-diff.ts`).
- Identity, tenant isolation, and permissions: none; no accounts, no private data.
- Forms and schema validation: no forms. URL state is validated with Zod 4.6.5 (`src/lib/url-state.ts`): each
  parameter parses on its own and an invalid value falls back to its default. Documents and rows are validated with
  validators generated at build time from the producer's JSON Schemas by Ajv 8.20.0's standalone code generation
  (draft 2020-12, `allErrors`, `strict`, `allowUnionTypes`, ajv-formats for `date-time` and `uri`), so nothing is
  compiled in the browser and the deployed Content Security Policy (`script-src 'self'`, no 'unsafe-eval') holds;
  `src/data/validate.ts` only calls them. The gate is `$schema`, and a kind or major version this build does not
  know renders the unsupported-schema state. `pnpm generate:types` runs `scripts/generate-types.mjs`
  (json-schema-to-typescript 16.0.0, the types) and `scripts/generate-validators.mjs` (the validators) into
  `src/data/schema/generated/`, checked in; CI fails if they are stale.
- Chart types, maximum expected data volume, aggregation: through UI-P3 the pages draw with semantic HTML only:
  the environment matrix and the three coverage matrices as tables whose cells carry the rate in their color and
  the fractions in their text and accessible name (DESIGN.md 7; `src/components/dashboard/rate-matrix.tsx`), the
  mutation operators as a table with a bar per operator, metric cards. No chart library yet; the plan's section 10
  lists what later phases draw, volumes in its 4.3, aggregation in the worker.
- Locale, currencies, timezone, and date-range semantics: the browser's locale for numbers (grouped thousands, one
  decimal for ms, s and bytes, two for exponents); UTC for every time, written `2026-10-08 13:34:53 UTC`, with the
  ISO form in `<time dateTime>`; no currencies; no date ranges (runs are picked by id). All through
  `src/lib/format.ts`; a rate never rounds up to 100%.
- Theme preference and persistence: light, dark or system (default system), in local storage under
  `benchmark-ui.theme`; `public/theme.js`, loaded synchronously from `index.html`'s head as a file (the deployed
  policy allows no inline script), applies the class on `<html>` before first paint, and `src/lib/theme.tsx` owns it
  afterwards.
- Content Security Policy: the production server's policy (`deploy/base/nginx/headers.inc` is the source of truth)
  is copied into `dev/results-plugin.ts` and sent on every dev and preview response, so a violation shows in
  `pnpm dev` and fails the Playwright smoke test; in dev alone the policy carries a nonce (`html.cspNonce`) for
  Vite's own injected scripts (its client and the React refresh preamble), which the production build does not
  have. The app ships no inline script and no runtime schema compilation.
- Sidebar preference persistence and responsive breakpoint: the generated sidebar's own behaviour: the desktop
  open/collapsed preference in the `sidebar_state` cookie, honoured on load, expanded by default from 1024 px and
  collapsed to icons below; the mobile sheet below 768 px, never persisted. DESIGN.md 4.2's measurements apply.
- Supported browsers and representative devices: current Chrome, Firefox and Safari; a laptop at 1280 px and a
  phone at 375 px for the home page, the runs list and the run page (the tables scroll horizontally in a labelled
  region; the page itself never overflows).
- Accessibility checks and manual test coverage: a skip link, one `main` (the generated `SidebarInset`), named
  navigation regions, every table in a labelled, focusable scroll region (`TableRegion`: the generated Table's own
  scrolling container cannot be focused, so the region takes the scrolling over), `aria-sort` on sortable headers, accessible names on every icon button, visible
  focus rings, focus moved to the page title on route change. The Playwright smoke test runs axe on the home page,
  the runs list and a run page against the fixtures. Keyboard runs by hand on the shell and the two pages.
- Performance budgets and measurement method: not yet measured; the plan's section 13 sets the targets for later
  phases (first render of the overview under 1 s, the viewer's first frame under 2 s). The run page opens from
  `index.json`, `manifest.json`, `summary.json`, the suite summaries, `findings.jsonl` and `ci.json` and loads no
  other row file.
- Test commands and CI requirements: `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest 5 with Testing Library,
  jsdom; the data layer, the formatters, the shell and both pages against the vendored fixtures through a fetch over
  the filesystem), `pnpm build`, `pnpm vendor:check`, `pnpm format:check`, and `pnpm test:e2e` (Playwright 1.63
  against `vite preview` with the fixtures). `.github/workflows/ci.yml` runs them on `workflow_dispatch` only, like
  the benchmark's CI, with the benchmark checked out at the locked commit for the vendor check.
- Approved animation assets and licensing: none yet; any Lottie asset is reviewed and stored under
  `public/animations/`.
- Approved additional libraries: TanStack Query; Ajv with ajv-formats (the compiler at build time only; at runtime
  the generated validators and ajv-formats' format table); json-schema-to-typescript; Zod; sirv (dev server only);
  Playwright 1.63.0 with `@axe-core/playwright` 4.13.0 (tests only). Added at UI-P5, as DESIGN.md 2.2 names them:
  `d3-scale` 4.0.2, `d3-shape` 3.2.0 and `d3-array` 3.2.4 with their `@types` (scales, step lines and medians; React
  renders every SVG node), and `gsap` 3.15.0 with `@gsap/react` 2.1.2 (the pipeline walk, the reveal-once and, at
  UI-P4, the shedding viewer; registered once in `src/lib/motion.ts` and imported only by lazily loaded modules, so
  the routes that do not animate never load it). Not yet added: TanStack Table and Virtual,
  `@lottiefiles/dotlottie-react`.
- Exceptions and linked architecture decisions:
  - TypeScript 6.0 instead of the newest major, until typescript-eslint supports it (above).
  - The desktop sidebar preference lives in the generated component's cookie, not in local storage as the plan's
    section 13 said; one owner, no second mechanism.
  - The suite × adapter matrix: only S1's suite summary carries per-adapter tallies, so for every other suite a cell
    counts the producer's judgments of that adapter's metrics in the suite (a fail among them is a fail; nothing is
    re-judged) and says "cross-adapter only" where a suite judges no metric per adapter.
  - `vite` and `lucide-react` are pinned one patch behind the newest release at UI-P0, so the lockfile respects
    pnpm's minimum release age without an exclusion.
  - The results volume is ReadWriteOnce, not ReadWriteMany (the plan's 12.2 and its fallback): the production
    cluster is a single node whose only storage class is LVM Storage's node-local class, which cannot provision
    RWX. `deploy/overlays/prod` patches the claim and runs one replica. The rolling update with no unavailable
    replica stands, since every pod lands on the volume's node and a ReadWriteOnce volume mounts in any number of
    pods there. The claim is read-only on the container's mount and read-write at the pod level, because the
    driver formats the volume at its first mount and refuses to when that mount is read-only.
  - The suite summaries' open blocks (`metamorphic`, `generated`, `summarizer`, the labeled details) and the
    summarizer summary's `by_arm` are not read (DESIGN.md 6.4): the S4 tallies, S5's steering chart and S11's
    curves wait for the harness to type them (the plan's section 14, items 8 to 10). The panels say so.
  - A finding's `signature` and a minimization's `before` and `after` are open records, shown as the key-value
    lists they are, never read by name; a minimized draft's files follow the spec's own schemas and are shown raw.
  - The contract's `planes[]` and `stages[]` are untyped: the coverage page orders slots by the contract's typed
    `slots[]` and the explorer names a timeline's lanes from the timeline's own `lanes[]`.
  - No `docs/adr/` entry yet; none of the above changes DESIGN.md's rules.
- Adoption/migration plan: greenfield; the plan's section 15. UI-P0 to UI-P3 are built; the site serves at its
  host with cert-manager's certificate (`deploy/README.md`).
