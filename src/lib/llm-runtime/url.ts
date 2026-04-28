/**
 * Tiny URL helpers shared by the LLM runtime client and the Settings UI so
 * trailing-slash handling is identical everywhere.
 */

export function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '')
}

export function joinUrl(base: string, path: string): string {
  return `${stripTrailingSlashes(base)}/${path.replace(/^\/+/, '')}`
}
