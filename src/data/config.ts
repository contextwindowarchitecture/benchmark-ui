// The runtime configuration document (DESIGN.md 6.4; ui-plan.md 5.1): served beside the build as
// /config.json, so one build serves every environment. It names the results root and nothing
// secret. A missing or invalid document is an error the app shows, never a silent default.

export type AppConfig = {
  /** Where the results tree is served from, without a trailing slash: "/results" or an origin. */
  resultsRoot: string
}

export class ConfigError extends Error {
  override readonly name = "ConfigError"
}

export const CONFIG_URL = "/config.json"

/** Checks the shape of a parsed config.json; throws ConfigError with a readable reason. */
export function parseConfig(json: unknown): AppConfig {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new ConfigError("config.json is not a JSON object")
  }
  const resultsRoot = (json as Record<string, unknown>)["resultsRoot"]
  if (typeof resultsRoot !== "string" || resultsRoot.trim() === "") {
    throw new ConfigError('config.json has no "resultsRoot" string')
  }
  if (!resultsRoot.startsWith("/") && !/^https?:\/\//.test(resultsRoot)) {
    throw new ConfigError(
      `"resultsRoot" must be an absolute path or an http(s) URL, not ${resultsRoot}`,
    )
  }
  return { resultsRoot: resultsRoot.replace(/\/+$/, "") }
}

/** Fetches and parses /config.json. Never cached: the server serves it with no cache lifetime. */
export async function loadConfig(
  fetchFn: typeof fetch = fetch,
  url: string = CONFIG_URL,
): Promise<AppConfig> {
  let response: Response
  try {
    response = await fetchFn(url, { cache: "no-store" })
  } catch (error) {
    throw new ConfigError(`could not fetch ${url}: ${errorMessage(error)}`)
  }
  if (!response.ok) {
    throw new ConfigError(`${url} answered ${response.status}`)
  }
  let json: unknown
  try {
    json = await response.json()
  } catch (error) {
    throw new ConfigError(`${url} is not JSON: ${errorMessage(error)}`)
  }
  return parseConfig(json)
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
