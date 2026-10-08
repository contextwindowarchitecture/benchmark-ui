/// <reference types="vite/client" />

/** The UI's git commit, set by vite.config.ts at build time ("dev" when git is unavailable). */
declare const __UI_COMMIT__: string
/** The benchmark commit vendor/cwa-bench.lock.json pins, set by vite.config.ts at build time. */
declare const __BENCHMARK_COMMIT__: string
