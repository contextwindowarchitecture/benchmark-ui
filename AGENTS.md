# AGENTS.md

Guidance for anyone, human or agent, working in this repository.

## What this is

The results UI of the CWA (Context Window Architecture) viability benchmark: a public, read-only site at
benchmark.contextwindowarchitecture.io that shows what each benchmark domain establishes about CWA. The benchmark
itself (the harness, the result schemas, the results and the write-ups) is `contextwindowarchitecture/benchmark`,
checked out beside this repository as `../benchmark`.

| Path | What |
| --- | --- |
| `DESIGN.md` | The front-end design baseline. Read it before any UI work; its definition of done (section 14) and agent workflow (section 13) apply to every change |
| `docs/plans/ui-plan.md` | The working plan: readers, the as-built data contract, pages, the shedding viewer, deployment, phases, decisions. Git-ignored: read and update it, never commit it |
| `docs/design/project-profile.md` | The project profile DESIGN.md section 15 asks for: the versions, the preset, the budgets, the test commands and the exceptions |
| `vendor/cwa-bench/` | The benchmark's schemas, fixture runs and write-up text, copied at the commit `vendor/cwa-bench.lock.json` pins by `scripts/vendor-benchmark.mjs` |
| `src/data/schema/generated/` | Types generated from the vendored schemas by `scripts/generate-types.mjs`; regenerate, never edit |
| `src/data/` | The data layer: `config.ts` (the runtime `/config.json`), `source.ts` (the `ResultsSource`), `validate.ts` (the schema gate), `queries.ts` (TanStack Query), `row-store.ts`, `rows.worker.ts` and `use-rows.ts` (rows filtered and paged, in the worker above the row budget), `use-blobs.ts` (blobs by digest through the index) |
| `src/components/` | `ui/` (generated shadcn primitives, kept as generated), `layout/` (the shell), `dashboard/` (page contract, states, badges), `charts/` (the shedding curve: D3 geometry, React SVG) |
| `src/content/` | The reviewed words of the narrative pages (what CWA is, the claims, the limits, the defects, the planes' and stages' words, the glossary), each file citing the benchmark commit the vendor lock pins; a test fails when the pin moves until the content is re-read |
| `src/features/d1/` | Domain 1: `model/` (pure selectors, the row kinds, the composite, the curve, the comparison) and `components/` (the runs list, the run page, the suite page and its `suite-panels/`, coverage, the findings pages, the answer explorer, `overview/` with the Domain 1 overview, `diagrams/`, the pipeline walk, compare) |
| `src/lib/motion.ts` | The one place GSAP is registered; only lazily loaded modules (the overview, the walk) import it |
| `dev/` | The Vite plugin that serves a results tree and `config.json` in `vite dev` and `vite preview` |
| `e2e/` | The Playwright smoke test over `vite preview` and the fixtures |
| `deploy/` | The container image, the nginx configuration, the Kustomize base and the production overlay (the cluster's storage, TLS through cert-manager), and `publish.sh`, which copies runs into the results volume; `deploy/README.md` is the procedure |

Status: phases UI-P0 (the scaffold, the data layer, the shell and routes, the runs list and the run page), UI-P1
(the deployment; the site serves at benchmark.contextwindowarchitecture.io), UI-P2 (the suite pages, the rows
worker), UI-P3 (coverage, findings, the answer explorer) and UI-P5 (the narrative layer: home, About, the Domain 1
overview, the domain pages, the diagrams, the pipeline walk, compare) are built. UI-P4 (performance, the shedding
viewer) and UI-P6 (polish) remain; their routes render a placeholder inside the shell. The plan's section 15 says
which phase builds what.

## Working on it

```sh
pnpm install
pnpm dev                                        # ../benchmark/domain1/results/d1 when it exists, else the fixtures
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm vendor:check && pnpm format:check
pnpm test:e2e                                   # needs `pnpm exec playwright install chromium` once
pnpm vendor ../benchmark && pnpm generate:types # move the pin: one commit with the copies, the lock and the types
```

- Node 24, pnpm 12, exact versions in `package.json`; adding a package needs a reason in the profile.
- Every document the UI reads is gated on its `$schema` and validated with the vendored schema; a new kind or major
  version is a vendoring change plus the UI that reads it, never a field read on faith. Where a block is untyped
  (the contract's planes, authority and stages, slot defaults, a timeline event's item fields) the page shows what
  is typed and takes its words from `src/content/`, until the harness types the block.
- Prose is content, numbers are data: a narrative page never restates a number in words; the content files hold
  words, cite their source commit, and are re-read when the pin moves.
- Pages account for every state of DESIGN.md 6.3 and 6.4 (`DataRegion`): loading, failed, pruned, not in this run,
  unsupported schema, invalid, empty.
- Tests come with the change: Vitest over the vendored fixtures (`src/test/fixture-fetch.ts` serves them without a
  server), and the Playwright smoke test for what only a browser shows.

## Boundaries

- Outside this repository, read only the benchmark checkout (`../benchmark`): its `domain1/schemas/`, its results
  under `domain1/results/`, and its `docs/`. Never modify it from here; harness changes are made in that repository,
  on request.
- The benchmark is vendored by copy at a pinned commit with a SHA-256 lock (`DESIGN.md` 6.4; the plan's section
  3.1), the way the assemblers vendor the specification. Never edit a vendored file: re-vendor and move the pin in
  one commit, with the regenerated types and the UI changes that go with it.
- Results are never committed here. They reach the site through the results volume (the plan's section 12).
- Don't add packages, change generated shadcn components, or add a second animation, chart or component library
  without a decision record (`docs/adr/`).

## Commits

- Commit incrementally while working: one logical change per commit, with tests passing, rather than one commit at
  the end. Tests come with the change. Never claim a check ran unless it did.
- Commit directly on `main`. **Never push**; the maintainer pushes.
- Follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):
  `<type>(<scope>): <summary>`, imperative mood, summary under about 72 characters, a body that explains why.
  - Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`.
  - Scopes, as the change fits: `shell`, `data`, `d1`, `charts`, `viewer`, `vendor`, `deploy`, `ci`, `deps`,
    `design`.
  - Breaking changes (a URL or configuration change existing links or deployments depend on): `!` after the scope,
    plus a `BREAKING CHANGE:` footer.
- Sign off every commit (`git commit -s`). The Developer Certificate of Origin is required, and a commit hook rejects
  commits without it. The person committing owns the commit: no `Co-Authored-By` trailers, and never a sentence
  about AI assistance or any other attribution in the message. The body explains the change and nothing else.
- Commits are GPG-signed by the global git config. Never bypass signing or hooks (`--no-gpg-sign`, `--no-verify`); if
  either fails, stop and ask.
- Never commit `docs/plans/`, `node_modules/`, `dist/`, results or secrets. Check `git status` before committing.
