/**
 * APK update check (sideload path).
 *
 * Polls the GitHub Releases API for `smackypants/trueai-localai`, compares the
 * latest release tag to the running app version (`__APP_VERSION__` injected by
 * Vite from `package.json`), and if a newer release exists, returns the APK
 * asset URL so the UI can prompt the user to download it.
 *
 * Design notes:
 *   - Only meaningful inside the Capacitor APK shell. On the web, the
 *     service-worker update path is used instead.
 *   - No new dependencies; uses `fetch`. Failures are swallowed (returns
 *     `null`) — this is a best-effort enhancement, never a blocker.
 *   - Result is cached in `localStorage` for `CHECK_TTL_MS` so we don't hammer
 *     the API on every launch.
 */

import { getAppVersion } from './diagnostics'

const RELEASES_API_URL =
  'https://api.github.com/repos/smackypants/trueai-localai/releases/latest'
const CACHE_KEY = 'trueai.apkUpdateCheck.v1'
const CHECK_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export interface ApkUpdateInfo {
  /** Tag from GitHub, e.g. "v1.0.3" */
  tag: string
  /** Cleaned semver, e.g. "1.0.3" */
  latestVersion: string
  /** Release HTML page URL (fallback link). */
  htmlUrl: string
  /** Direct download URL of the preferred APK asset, or `null` if none. */
  apkUrl: string | null
  /** Asset filename of the APK we picked, if any. */
  apkName: string | null
  /** Release notes body, possibly empty. */
  body: string
}

interface CachedResult {
  checkedAt: number
  appVersion: string
  result: ApkUpdateInfo | null
}

/**
 * Compare two dotted-numeric version strings (leading "v" stripped).
 * Returns positive if `a > b`, negative if `a < b`, 0 if equal.
 * Non-numeric segments compare as 0 to stay forgiving.
 */
export function compareVersions(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .replace(/^v/i, '')
      .split(/[.\-+]/)
      .map((p) => {
        const n = parseInt(p, 10)
        return Number.isFinite(n) ? n : 0
      })
  const aa = norm(a)
  const bb = norm(b)
  const len = Math.max(aa.length, bb.length)
  for (let i = 0; i < len; i++) {
    const av = aa[i] ?? 0
    const bv = bb[i] ?? 0
    if (av !== bv) return av - bv
  }
  return 0
}

interface GithubAsset {
  name: string
  browser_download_url: string
  content_type?: string
}

interface GithubRelease {
  tag_name: string
  html_url: string
  body?: string
  assets?: GithubAsset[]
  draft?: boolean
  prerelease?: boolean
}

/**
 * Pick the best APK asset from a release. Prefers a signed release-build APK
 * over an unsigned-release APK over a debug APK; falls back to the first
 * `.apk` asset.
 */
export function pickApkAsset(
  assets: GithubAsset[] | undefined
): GithubAsset | null {
  if (!assets || assets.length === 0) return null
  const apks = assets.filter((a) => /\.apk$/i.test(a.name))
  if (apks.length === 0) return null
  const release = apks.find(
    (a) => /release/i.test(a.name) && !/unsigned/i.test(a.name)
  )
  if (release) return release
  const releaseUnsigned = apks.find((a) => /release/i.test(a.name))
  if (releaseUnsigned) return releaseUnsigned
  const nonDebug = apks.find((a) => !/debug/i.test(a.name))
  if (nonDebug) return nonDebug
  return apks[0]
}

function readCache(): CachedResult | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedResult
    if (typeof parsed?.checkedAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(value: CachedResult): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(CACHE_KEY, JSON.stringify(value))
  } catch {
    // ignore quota / private-mode errors
  }
}

export interface CheckOptions {
  /** Override the API URL (used by tests). */
  apiUrl?: string
  /** Override `__APP_VERSION__` (used by tests). */
  currentVersion?: string
  /** Force a network check, ignoring the TTL cache. */
  force?: boolean
  /** Custom fetch (used by tests / non-browser environments). */
  fetchImpl?: typeof fetch
  /** Override TTL (ms) for cache freshness. */
  ttlMs?: number
}

/**
 * Check whether a newer APK release is available. Returns:
 *   - `ApkUpdateInfo` if a strictly newer release exists,
 *   - `null` if up-to-date or the check failed.
 *
 * Safe to call on web; returns `null` if `fetch` is not available.
 */
export async function checkForApkUpdate(
  options: CheckOptions = {}
): Promise<ApkUpdateInfo | null> {
  const currentVersion = options.currentVersion ?? getAppVersion()
  const ttl = options.ttlMs ?? CHECK_TTL_MS
  const fetchImpl =
    options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined)
  if (!fetchImpl) return null

  if (!options.force) {
    const cached = readCache()
    if (
      cached &&
      cached.appVersion === currentVersion &&
      Date.now() - cached.checkedAt < ttl
    ) {
      return cached.result
    }
  }

  let release: GithubRelease
  try {
    const res = await fetchImpl(options.apiUrl ?? RELEASES_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) {
      // Cache the negative result for the TTL so we don't retry constantly.
      writeCache({
        checkedAt: Date.now(),
        appVersion: currentVersion,
        result: null,
      })
      return null
    }
    release = (await res.json()) as GithubRelease
  } catch {
    return null
  }

  if (!release || release.draft || release.prerelease || !release.tag_name) {
    writeCache({
      checkedAt: Date.now(),
      appVersion: currentVersion,
      result: null,
    })
    return null
  }

  const latestVersion = release.tag_name.replace(/^v/i, '')
  if (compareVersions(latestVersion, currentVersion) <= 0) {
    writeCache({
      checkedAt: Date.now(),
      appVersion: currentVersion,
      result: null,
    })
    return null
  }

  const asset = pickApkAsset(release.assets)
  const info: ApkUpdateInfo = {
    tag: release.tag_name,
    latestVersion,
    htmlUrl: release.html_url,
    apkUrl: asset?.browser_download_url ?? null,
    apkName: asset?.name ?? null,
    body: release.body ?? '',
  }
  writeCache({
    checkedAt: Date.now(),
    appVersion: currentVersion,
    result: info,
  })
  return info
}

/** Internal: clear the cached check result (used by tests). */
export function _clearApkUpdateCache(): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}
