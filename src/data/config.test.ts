// @vitest-environment node
import { describe, expect, it } from "vitest"

import { ConfigError, loadConfig, parseConfig } from "./config"

describe("parseConfig", () => {
  it("accepts a results root and strips a trailing slash", () => {
    expect(parseConfig({ resultsRoot: "/results/" })).toEqual({ resultsRoot: "/results" })
    expect(parseConfig({ resultsRoot: "https://results.example/root" })).toEqual({
      resultsRoot: "https://results.example/root",
    })
  })

  it("rejects a missing or malformed root", () => {
    expect(() => parseConfig({})).toThrow(ConfigError)
    expect(() => parseConfig([])).toThrow(ConfigError)
    expect(() => parseConfig({ resultsRoot: "results" })).toThrow(/absolute path/)
  })
})

describe("loadConfig", () => {
  const answer = (status: number, body: string) => async () => new Response(body, { status })

  it("loads /config.json without caching", async () => {
    let request: [string, RequestInit | undefined] | null = null
    const fetchFn: typeof fetch = async (input, init) => {
      request = [String(input), init]
      return new Response('{"resultsRoot":"/results"}', { status: 200 })
    }
    expect(await loadConfig(fetchFn)).toEqual({ resultsRoot: "/results" })
    expect(request).toEqual(["/config.json", { cache: "no-store" }])
  })

  it("turns a missing or invalid document into a ConfigError", async () => {
    await expect(loadConfig(answer(404, ""))).rejects.toThrow(/answered 404/)
    await expect(loadConfig(answer(200, "nope"))).rejects.toThrow(/not JSON/)
    await expect(loadConfig(answer(200, "{}"))).rejects.toThrow(/resultsRoot/)
    await expect(
      loadConfig(async () => {
        throw new TypeError("Failed to fetch")
      }),
    ).rejects.toThrow(/could not fetch/)
  })
})
