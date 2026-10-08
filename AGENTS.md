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
| `vendor/cwa-bench/` | Not yet: the benchmark's schemas, fixture runs and write-up text, copied at the commit `vendor/cwa-bench.lock.json` pins |
| `deploy/` | Not yet: the container image, the OpenShift manifests and the results publishing procedure |

Status: design only. Nothing is built. The plan's phase UI-P0 (harness changes in the benchmark repository first,
then the scaffold here) starts when the maintainer asks, not before.

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
  commits without it. The person committing owns the commit: no `Co-Authored-By` trailers. Mentioning AI assistance
  in the body is fine.
- Commits are GPG-signed by the global git config. Never bypass signing or hooks (`--no-gpg-sign`, `--no-verify`); if
  either fails, stop and ask.
- Never commit `docs/plans/`, `node_modules/`, `dist/`, results or secrets. Check `git status` before committing.
