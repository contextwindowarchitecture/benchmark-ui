// The Web Worker that keeps one sweep file (ui-plan.md 9.1). sweep-worker-core does the work; this
// file only binds it to the worker's message port.

import { createSweepWorkerCore, type SweepRequest } from "./sweep-worker-core"

type WorkerScope = {
  onmessage: ((event: MessageEvent<SweepRequest>) => void) | null
  postMessage(message: unknown): void
}

const scope = self as unknown as WorkerScope
const handle = createSweepWorkerCore((response) => scope.postMessage(response))
scope.onmessage = (event) => {
  void handle(event.data)
}
