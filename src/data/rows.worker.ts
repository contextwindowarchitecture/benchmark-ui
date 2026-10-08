// The Web Worker that keeps one large row file (ui-plan.md 5.4). rows-worker-core does the work;
// this file only binds it to the worker's message port.

import { createRowsWorkerCore, type WorkerRequest } from "./rows-worker-core"

type WorkerScope = {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
  postMessage(message: unknown): void
}

const scope = self as unknown as WorkerScope
const handle = createRowsWorkerCore((response) => scope.postMessage(response))
scope.onmessage = (event) => {
  void handle(event.data)
}
