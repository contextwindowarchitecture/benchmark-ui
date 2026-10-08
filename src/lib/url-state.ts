// Shareable page state lives in the query string and is validated with Zod (DESIGN.md 6.1;
// ui-plan.md 6.2): each parameter is parsed on its own, so one bad value falls back to its default
// without discarding the rest of the URL.

import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"
import type { z } from "zod"

type Shape = Record<string, z.ZodType>

export type UrlState<S extends Shape> = { [K in keyof S]: z.output<S[K]> | undefined }

export function parseUrlState<S extends Shape>(shape: S, params: URLSearchParams): UrlState<S> {
  const result = {} as UrlState<S>
  for (const key of Object.keys(shape) as (keyof S & string)[]) {
    const raw = params.get(key)
    if (raw === null) {
      result[key] = undefined
      continue
    }
    const parsed = shape[key]?.safeParse(raw)
    result[key] = parsed?.success ? (parsed.data as z.output<S[typeof key]>) : undefined
  }
  return result
}

/**
 * Reads the parameters a shape names and sets them, dropping a key whose new value is undefined.
 * Updates replace the history entry, so filter changes do not pile up in the back stack.
 */
export function useUrlState<S extends Shape>(
  shape: S,
): [UrlState<S>, (patch: Partial<{ [K in keyof S]: z.output<S[K]> | undefined }>) => void] {
  const [params, setParams] = useSearchParams()
  const state = useMemo(() => parseUrlState(shape, params), [shape, params])
  const update = useCallback(
    (patch: Partial<{ [K in keyof S]: z.output<S[K]> | undefined }>) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === "") next.delete(key)
            else next.set(key, String(value))
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )
  return [state, update]
}
