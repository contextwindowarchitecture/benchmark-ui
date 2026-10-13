# Project design profile

The profile DESIGN.md section 15 asks for, moved here from the plan's section 13 when phase UI-P0 started
(2026-10-08) and filled in with what was actually chosen. Every line names the section of DESIGN.md or of the
plan (`docs/plans/ui-plan.md`, local) it answers to.

- Baseline revision: DESIGN.md 1.3
- Repository: `contextwindowarchitecture/benchmark-ui`, vendoring the benchmark by copy at a pinned commit (the
  plan's 3.1): `vendor/cwa-bench/` holds each domain's v1 schemas (29 of Domain 1, 27 of Domain 2), fixture runs
  (Domain 1's three, Domain 2's one) and write-up, and the viability document; the lock
  `vendor/cwa-bench.lock.json` pins commit `d970fef` of `contextwindowarchitecture/benchmark`. `pnpm vendor
  ../benchmark` re-vendors; `pnpm vendor:check` fails on drift between the lock, the copy and the checkout at the
  locked commit. Never edit a vendored file; move the pin in one commit with the regenerated types.
- Application type and primary user tasks: a public, read-only results site for the benchmark; the plan's section 1.
- Framework and routing strategy: Vite 8.3.3 with `@vitejs/plugin-react` 6.1.2, React 19.3.0, React Router 8.4.0 in
  data mode (`createBrowserRouter`; route `handle`s carry the page title and the breadcrumb); client-side only, no
  server rendering. The routes are the plan's 6.2, every one a built page.
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
  replaced by the adapter hues (in `html:root` and `html.dark` blocks, since `tokens.css` is imported before the
  generated `:root` and `.dark` and would otherwise lose to them; until UI-P6 it did, and the adapters drew in
  greys); status colors are never used for series. Every status badge meets WCAG AA on its
  tint in the light theme (axe checks it in the smoke test).
- The site notice and the brand: the preview banner above the header has its own orange pair (`--notice`,
  `--notice-foreground`), the same in both themes and apart from the status hues, so it never reads as a verdict on
  the data. It pulses once every 2 s (WCAG 2.3.1 allows three flashes a second), stops under reduced motion and can be
  dismissed for the session (WCAG 2.2.2); its text reads at AA on both ends of the pulse. The project's logo comes
  from the organization's profile (`contextwindowarchitecture/.github`, `profile/assets/`), copied into
  `src/assets/brand/` because the CSP serves images from the site's own origin only: resized to 560 px wide for the
  sidebar's link back to contextwindowarchitecture.io, and its window mark cropped for the brand slot, which the
  collapsed sidebar shows alone.
- Remote data ownership and cache policy: TanStack Query 5.104.1 over the `ResultsSource` adapter
  (`src/data/source.ts`, DESIGN.md 6.4). Everything under a run id is cached for the session (`staleTime` and `gcTime`
  infinite); the runs index refetches on window focus and on the Refresh action. A 404 is a state (pruned, not in this
  run), never retried. Query keys carry the results root, the domain, the run id and the path. There is one source per
  domain (`<root>/<domain>/…`); the shell sets the results domain from the path (`/d2…` is Domain 2's, everything else
  Domain 1's), so every hook, the workers and the run picker read the page's domain.
- Data source and publishing: the client reads `/config.json` (`{ "resultsRoot": "/results" }`) at startup
  (`src/data/config.ts`); a missing or malformed document is a visible error, never a default. In `vite dev` and
  `vite preview` a plugin (`dev/results-plugin.ts`) serves `/results/d1/` and `/results/d2/` from the benchmark
  checkout's `domain1/results/d1` and `domain2/results/d2` when they are beside this repository, else from the
  vendored fixtures, with `VITE_RESULTS_DIR` and `VITE_D2_RESULTS_DIR` overriding them; JSON and JSONL get their
  media types, misses 404, no listing. Deployed, the same build serves `/results/` from a volume published to by
  `deploy/publish.sh` (`deploy/`, the plan's section 12).
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
  `src/data/validate.ts` only calls them. Each domain's validators are a module of their own: Domain 1's in the main
  chunk, Domain 2's (about 800 kB) imported on first use by the query functions and the rows worker, so Domain 1's
  pages never load them; the workers are ES modules so they can. Domain 1's kinds keep their names (`summary`), Domain
  2's are keyed behind the domain (`d2/summary`, `D2SummaryV1`). The gate is `$schema`, and a kind or major version
  this build does not know renders the unsupported-schema state. `pnpm generate:types` runs
  `scripts/generate-types.mjs` (json-schema-to-typescript 16.0.0, the types) and `scripts/generate-validators.mjs`
  (the validators) into `src/data/schema/generated/`, checked in; CI fails if they are stale.
- Chart types, maximum expected data volume, aggregation: the environment matrix and the three coverage matrices as
  tables whose cells carry the rate in their color and the fractions in their text and accessible name (DESIGN.md 7;
  `src/components/dashboard/rate-matrix.tsx`), the mutation operators as a table with a bar per operator, metric
  cards. From UI-P5, the shedding curve (`src/components/charts/shedding-curve.tsx`: D3 scales and a step path, React
  SVG, rules at the protected size, the floor and the threshold, the refused region named, a table of every frame as
  its alternative; one adapter when the four agree, every adapter overlaid otherwise), drawn from a sweep file loaded
  whole in a worker (`src/data/sweep-worker-core.ts`, under the 30 MB budget: 3.7 to 20 MB real, up to 737 frames per
  adapter) that answers one point per frame (the harness's `curve[]` when the file has one, else derived from the
  frames); the four diagrams as React SVG from the contract's typed slots, the timeline schema's lanes, the
  self-check's metrics and the S2 cells, each hidden from assistive technology beside a text equivalent; the pipeline
  walk over a timeline's events (up to a few hundred); the median pressure exponent per adapter over the perf
  summary's fits (864 in the real run), the median the viewer's and said so. From UI-P4, the shedding viewer: the
  curve with a cursor at the frame, the item strip (`src/components/charts/item-strip.tsx`: one row per item, up to
  a few hundred, grouped by tier on the curve's budget axis, each row's segments the frames' own states merged where
  they agree, a compressed stretch hatched, the slot's plane as the hue, the items the frame did not keep dimmed,
  scrolling in place past 520 px), the lanes of a frame's timeline, and the counters as text; the worker answers each
  frame's item states as one byte per item per frame (under 125 kB for the real run's largest sweep, 737 frames ×
  42 items × 4 adapters). The scaling fits as small multiples (`scaling-plots.tsx`: one log-log panel per shape on
  shared axes, a series per adapter in its color and symbol, each fit's points the cells its typed series names and
  its line the harness's slope through their log mean, a fit under four points drawn as points; the exponents, r²
  and points as text beside each panel). S7's grid as a table whose cells carry the share of budgets on which every
  adapter agreed in their color and text, with timeouts and skips marked apart (1,317 rows in the real run, loaded
  on request); startup, throughput and time to refusal as tables with a bar per row. From UI-D2, Domain 2's arm plot (`src/components/charts/arm-plot.tsx`: one row per arm, grouped as
  upper bounds, conventional baselines and CWA arms, a dot with its interval or a bar from zero, a lighter bar behind
  for a second value of the same unit, a dashed reference rule, the value as text beside each row) and the small
  multiples over corpus size (`tier-lines.tsx`: one panel per arm, a log scale of the corpus as a multiple of the
  budget, the reference arm faint in every panel); each with a summary and a table of every value. Arms are categories
  with no hue of their own: their group's mark (an outline, grey, the accent) carries them, with the id as text. The
  arm × tier tables on Domain 2's suite pages hold every per-arm metric with its fraction and interval.
  From UI-D2c, Domain 2's question pages (variable tracking, instruction persistence, long context, cost) reuse the
  arm plot and the small multiples (the latter also over a conversation's turn count, still on a log scale) with
  shares from the summaries' typed tallies, each with its table; no new chart.
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
- Supported browsers and representative devices: current Chrome, Firefox and Safari; a laptop at 1280 px, a
  compact desktop at 1024 px, a phone at 375 px, and 320 px for reflow (WCAG 1.4.10: 400% zoom of a 1280 px
  screen). The tables scroll horizontally in a labelled region; the page itself never overflows, and nothing spills
  out of a table cell over the next (the generated cells do not wrap, so text that must wraps in a cell that does).
  The model, environment and oracle diagrams lay themselves out in their frame's measured width: on a phone the
  model pairs its planes, the environment diagram bands its platforms and the oracles stack on a spine, rather
  than scrolling inside the frame. The shedding viewer shows one panel at a time below 1024 px (the URL's `view`
  picks it), the curve beside the items or the lanes above. The Playwright smoke test opens the home page, the
  Domain 1 overview, the S2 suite page, coverage, the shedding viewer in two views, the sweeps list, performance,
  and Domain 2's overview, a run page, a suite page with its rows loaded and its four question pages at 375 px, and the home page, both
  overviews, a run page, the viewer and performance at 320 px, and fails if the page scrolls sideways or anything
  outside a table region reaches past the screen's edge. The automated runs are Chromium only.
- Accessibility checks and manual test coverage: a skip link, one `main` (the generated `SidebarInset`), named
  navigation regions, every table in a labelled, focusable scroll region (`TableRegion`: the generated Table's own
  scrolling container cannot be focused, so the region takes the scrolling over; the viewer's item strip, which
  scrolls in place, is one too), `aria-sort` on sortable headers, accessible names on every icon button, visible
  focus rings, every link and control at least 24 px (WCAG 2.5.8), focus moved to the page title on route change
  (a lazily loaded page's title takes it over from its fallback's; choosing a run in the header's picker lands
  there too), and focus returned to the menu button when the phone's navigation sheet closes on Escape (the
  generated sheet has no trigger of its own to return it to; `src/components/layout/use-sheet-focus-return.ts`).
  Diagrams are `aria-hidden` pictures beside a text equivalent that carries every word; the shedding curve is an
  `img` named by its title and summary with a table alternative; the pipeline walk is a range input with buttons
  and the current step as text, and under reduced motion shows the final state with no playback. The shedding
  viewer is the same: a range input over the frames (arrows step, space plays and pauses), step and jump buttons,
  the frame's counters as text and its value text on the slider, no play button under reduced motion and the last
  frame first. The item strip and each scaling panel are `img`s named by a sentence that carries their values,
  with a table of every item or fit. The Playwright smoke test runs axe (WCAG 2.0, 2.1 and 2.2 A and AA) on every
  route: home, About, the glossary, a missing page, both domains' overviews, runs lists, run pages and a suite page
  each, the explorer, coverage, the findings list and a finding, a pruned run, compare, a not-started domain, the
  sweeps list, the viewer in each view, S7's suite page with its grid, and performance; and on eleven pages of
  every kind again in the dark theme. It plays a sweep to its last frame and steps it from the keyboard, scrolls a
  coverage matrix from the keyboard, opens the run picker and chooses a run with the keyboard alone, checks the
  overview and the viewer under `prefers-reduced-motion`, the sidebar's collapse across a reload, and the phone's
  sheet closing on Escape. Forced colors were checked by screenshot under Chromium's emulation (the status badges
  keep their icons and words, the charts their marks and text); no screen reader was run.
- Performance budgets and measurement method (set and measured at UI-P6):
  - Bundle, gzipped, checked by `pnpm budgets` (`scripts/check-budgets.mjs`) over a production build, in CI after
    the build: the initial load's JavaScript (the entry and the modules it preloads: React, the router, the shell,
    Domain 1's validators) 400 kB, measured 377 kB (380 kB at UI-D2c); its stylesheet 20 kB, measured 15 kB; each lazy page or shared
    chunk 40 kB (the largest, the shared chunk with GSAP, 28 kB); each domain's validators 100 kB (83 kB); each
    worker 120 kB (94 kB). The overviews, the walk, the viewer, performance and Domain 2's question pages (2 to 3 kB
    each, with an 8 kB chunk they share with the overview) load on first visit, so the dashboard pages carry
    neither D3 nor GSAP.
  - Rendering and interaction, checked by `pnpm test:perf` (Playwright over the production build and the results
    beside this repository; the checks that need the real S7 run skip without it), each time taken in the page
    from the navigation or the action: Domain 1's headline on home within 1 s (126 ms), the Domain 1 overview's
    headline cards within 1 s on the real nightly (369 ms) with no row file requested but each run's
    `findings.jsonl` (tens of rows, for the counts by severity the summary does not carry), a run page to a suite
    page within 500 ms (80 ms), the viewer's first frame from the real run's 20 MB sweep within 2 s (544 ms), one
    step reflected in the counters within 100 ms (6 ms), and the main thread's heap with that sweep loaded under
    64 MB (19 MB: the frames stay in the worker). Against the container (the plan's 12.5) with the real results
    mounted: the overview 389 ms, the viewer 605 ms, every budget met. Not run in CI, whose shared runners would
    make the times noise; measured on the maintainer's laptop (Apple silicon) and in its podman machine.
  - What each page opens: the viewer the run's `index.json` and one sweep (in the worker), then the frames' item
    states and the shown adapter's five timelines; the sweeps list and the S7 panel S7's summary, the grid its rows
    on request; performance `perf/summary.json` alone; the overview the two runs' `index.json`, `summary.json` and
    `manifest.json`, the nightly's `ci.json`, `coverage.json`, `contract.json` and S2 summary, the S7 run's
    `perf/summary.json`, one sweep (in the worker), one timeline and each run's `findings.jsonl`; the run page
    `index.json`, `manifest.json`, `summary.json`, the suite summaries, `findings.jsonl` and `ci.json`, and no other
    row file.
- Test commands and CI requirements: `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest 5 with Testing Library,
  jsdom; the data layer, the formatters, the shell and the pages against the vendored fixtures through a fetch over
  the filesystem), `pnpm build`, `pnpm budgets`, `pnpm vendor:check`, `pnpm format:check`, and `pnpm test:e2e`
  (Playwright 1.63 against `vite preview` with the fixtures). `.github/workflows/ci.yml` runs them on
  `workflow_dispatch` only, like the benchmark's CI, with the benchmark checked out at the locked commit for the
  vendor check. `pnpm test:perf` runs by hand. With `PLAYWRIGHT_BASE_URL` set, both Playwright runs test that
  server instead of starting one: the image, run as `deploy/README.md` says, over the fixtures for the smoke test
  and over the real results for the budgets.
- Approved animation assets and licensing: none. The plan's 7.5 allows Lottie for a home page hero, the
  not-started domain cards and the empty findings state, all optional; none was asked for, so UI-P6 added none and
  `@lottiefiles/dotlottie-react` is not a dependency. An asset added later is reviewed, licensed and stored under
  `public/animations/` with a static fallback, and never carries status.
- Approved additional libraries: TanStack Query; Ajv with ajv-formats (the compiler at build time only; at runtime
  the generated validators and ajv-formats' format table); json-schema-to-typescript; Zod; sirv (dev server only);
  Playwright 1.63.0 with `@axe-core/playwright` 4.13.0 (tests only). Added at UI-P5, as DESIGN.md 2.2 names them:
  `d3-scale` 4.0.2, `d3-shape` 3.2.0 and `d3-array` 3.2.4 with their `@types` (scales, step lines and medians; React
  renders every SVG node), and `gsap` 3.15.0 with `@gsap/react` 2.1.2 (the pipeline walk, the reveal-once and, at
  UI-P4, the shedding viewer; registered once in `src/lib/motion.ts` and imported only by lazily loaded modules, so
  the routes that do not animate never load it). Not added: TanStack Table and Virtual (row tables are paged a
  hundred at a time, within every budget), `@lottiefiles/dotlottie-react` (no asset).
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
  - Domain 2's suite summaries' `model`, `by_arm` and `cost` blocks are typed since the pin at `58ef771` (the
    plan's section 14, ask 13) and read: the paired differences from the reference arm, accuracy with the needed
    facts sent and not, the breakdowns by family, turn count, rule, kind and format, S4's abstentions, S5's
    under-count by prompt size, S6's reply lengths and the model's calls. Two records inside them stay open by
    nature, the request's extra fields and the server's own listing of the model, and are shown as the key-value
    lists they are, never read by name.
  - Runs from a harness before `95ee813` file an overflow in S2's and S3's `given` by S1's record of the payload
    the arm would have sent, so such an answer can sit under "facts sent" although nothing was sent (concat at
    8,192 tokens in the recorded run); S1 counts only payloads that fit. From `95ee813` on, the harness files
    every overflow and refusal as not sent (the plan's section 14, ask 15). The attribution tables flag an arm
    whose answers that reached no model outnumber its "not sent" tally, say how many sit under "facts sent", and
    never infer from an empty "not sent" tally that every fact was sent; a run from the fixed harness shows no
    flag.
  - Most of the recorded run's row files are above the worker's 30,000-row budget (S2's grades 93,312 rows and
    79 MB, S1's turns 135 MB): a suite page offers them as downloads at once and its typed blocks stand in for
    them, until the harness splits them (ask 16). A run page lists a kind of more than 100 files (9,072
    timelines) as one row, a page of 200 at a time on request.
  - Every schema of both domains compiles under Ajv's full strict mode: `lq-corpus` declares a question's
    `answer` (ask 14), so no per-domain Ajv option remains in `scripts/schema-domains.mjs`.
  - Domain 2's overview reads each suite from the newest finished run outside a CI profile that has it, else the
    newest that has it, with `?run=` pinning one run's suites: the viewer's composite, since the write-up combines
    runs and the harness names no reported run. A run whose summary is not there (pruned, 6.4) is read past to the
    next run that has the suite, and the page says which run stands in for which; a summary that fails for any
    other reason is not. The page names the run and the scripts' size of every panel.
  - Domain 2's question pages (`/d2/tracking`, `/d2/instructions`, `/d2/long-context`, `/d2/cost`) read runs the
    overview's way (`components/evidence/use-evidence.ts`), not a domain's latest run, which may hold no S2. Two of
    them take their metric from a paper Domain 2 does not run (RULER, LongBench v2): the label names the metric
    only, and the page's first section names the viability document's row, links the paper, says Domain 2 runs
    neither, and says how it measures the metric instead.
  - S7's `scale` block and the perf summary's `policy` and `series` are typed since the pin at `73c4757` (the
    plan's section 14, ask 18) and read: the sweeps list, the threshold searches, the timeouts and the cells the
    generator cannot build come from the summary without opening a sweep file, and a fit's points are the cells
    its series names. Settings keep any key the `[s7]` section adds as an open remainder, never read by name.
  - The scaling plots' lines are the harness's exponents drawn through the points' mean in log space, where a
    least-squares line passes; the viewer computes no fit, and a test checks that the points it picks give back
    the harness's exponent.
  - The suite summaries' open blocks (`metamorphic`, `generated`, `summarizer`, the labeled details) and the
    summarizer summary's `by_arm` are not read (DESIGN.md 6.4): the S4 tallies, S5's steering chart and S11's
    curves wait for the harness to type them (the plan's section 14, items 8 to 10). The panels say so.
  - A finding's `signature` and a minimization's `before` and `after` are open records, shown as the key-value
    lists they are, never read by name; a minimized draft's files follow the spec's own schemas and are shown raw.
  - The contract's `planes[]` and `stages[]` are untyped: the coverage page orders slots by the contract's typed
    `slots[]` and the explorer names a timeline's lanes from the timeline's own `lanes[]`.
  - The contract's `planes[]`, `authority[]` and `stages[]`, `slots[].defaults` and a timeline event's per-type
    fields are untyped (the plan's harness ask 11): the model diagram draws the typed slots, grouped by the id's
    plane prefix, with the planes' names and the stages' words from `src/content/d1/vocabulary.ts`, which quotes
    the specification; the three tiers are left out of the diagram, and the pipeline walk names an event by its
    sequence and type, not its item, until the harness types them.
  - The overview's pressure exponents are medians this viewer takes over the harness's fits (`series: diagonal`,
    `method: inprocess`, labels `ratio:1.0` and `ratio:0.1`, the pair that reproduces the write-up's table); the
    table says so. Compare computes its sections for a pair the harness did not compare, under a banner, and never
    golden drift. The reason codes exercised on the overview is a count over `coverage.json`, labelled a count.
  - Reveal-once keeps its flag in session storage (a per-viewer convenience, as DESIGN.md 6.1 allows); no storage
    means no reveal, never a replay.
  - The real S7 run predates the harness's compact `curve[]` (ask 2), so its sweeps' curves are derived from the
    frames in the worker; the harness's curve is preferred wherever a file carries one of the frames' length.
  - The failing Domain 1 run of 2026-10-08 is kept as the development-time record of the defects (made on a
    development machine at an older contract, reporting nothing): its run, findings and finding pages and the
    overview's defects table say so, in the words of `src/content/d1/defects.ts`, keyed by the run id that file names.
  - Where every adapter and cell of a perf summary records the same peak resident memory (the reported S7 run's
    Linux host recorded one figure for all), the performance page says the figure is not the adapters' own, as the
    write-up does, and still shows it as recorded; the viewer infers nothing else from it.
  - The URL's run ids are validated with Zod; a malformed id falls back to the index's choice without a notice, a
    well-formed id the index does not list gets one.
  - No `docs/adr/` entry yet; none of the above changes DESIGN.md's rules.
- Adoption/migration plan: greenfield; the plan's section 15. Every phase, UI-P0 to UI-P6 and UI-D2 (with UI-D2c's question pages), is built; the
  site serves at its host with cert-manager's certificate (`deploy/README.md`).

## Definition of done (DESIGN.md 14), as checked at UI-P6

- [x] The shared shell is reused: every route renders inside `DashboardShell`, the narrative pages in its wide
  variant; no alternate shell.
- [x] Semantic tokens control color, spacing, typography and status styling: `tokens.css` over the generated
  stylesheet; the adapters' hues now win over the preset's greys.
- [x] Mobile, compact desktop, expanded desktop and the user's collapse preference: 375 px and 320 px in the smoke
  test, 1024 px in the keyboard test, 1280 px throughout; the collapse is kept across a reload.
- [x] Keyboard navigation, focus restoration, route focus and the skip link: the smoke test's keyboard runs (the
  viewer, a matrix, the run picker), route focus after a link, a lazy page and the picker, focus back on the menu
  button from the phone's sheet; the skip link and one `main` on every page.
- [x] Light, dark, reduced motion, zoom and long content: axe in both themes, the viewer and the overview under
  reduced motion, reflow at 320 px, and the check that nothing spills out of a table cell. Browser zoom itself was
  not driven; 320 px stands for 400%.
- [x] Loading, empty, no-results, error, refreshing and forbidden states as they apply: `DataRegion`'s states in
  the page tests (loading, failed, pruned, not in this run, unsupported, invalid, empty); the runs index's refresh;
  forbidden does not apply (no accounts).
- [x] Filters validated and shareable; comparison periods and timezones explicit: every filter and choice is URL
  state parsed with Zod, one bad value falling back alone; times are UTC with the zone written; compare names its
  two runs.
- [x] Charts handle invalid, missing, single-point, constant, negative and large data: the geometry tests of each
  chart (no frames, one frame, one budget, non-finite and negative values, all zeros, a fit under four points), and
  the 737-frame, 20 MB sweep under the performance budgets.
- [x] No DOM or property ownership conflicts: React renders every node; D3 computes scales and paths; GSAP drives a
  clock whose progress is a frame or step index, and the reveal's dash offset, cleared after; no Lottie.
- [x] Route changes and Strict Mode leak nothing: the app runs under `StrictMode`; `useGSAP` reverts its tweens on
  dependency change and unmount, `useMeasure` disconnects its observer, the frame player and the sheet's focus
  return cancel their frames. The rows and sweep workers live for the session by design (5.2: a run is
  immutable), one per file.
- [x] Type checking, lint, unit and component tests, the end-to-end smoke test and the production build pass, with
  the bundle budgets, the vendor check and the formatting check; the smoke test and the performance budgets also
  pass against the container.
- [x] Dependency changes, budgets and deviations recorded: this profile (no package added at UI-P4 or UI-P6).

Not run, and named: Firefox and Safari (every automated run is Chromium); a screen reader (NVDA, VoiceOver);
Windows' own high-contrast themes (forced colors only under Chromium's emulation, by screenshot); browser zoom as
such; interaction latency beyond the viewer's step and memory beyond its main thread.
