# benchmark-ui

The results site of the CWA (Context Window Architecture) viability benchmark, to run at
benchmark.contextwindowarchitecture.io. It reads the runs the benchmark harness writes
([contextwindowarchitecture/benchmark](https://github.com/contextwindowarchitecture/benchmark)) and shows what each
domain of the benchmark establishes about CWA: the claim, the evidence, how far to trust it, and every number behind
it.

**Status: design only.** Nothing is built yet. [DESIGN.md](DESIGN.md) is the front-end design baseline, and the
working plan (readers, the data contract, pages, the shedding viewer, deployment, phases) is kept locally under
`docs/plans/`, like the benchmark's own plans. The benchmark's schemas, fixtures and write-ups will be vendored here
at a pinned commit; results never are.
