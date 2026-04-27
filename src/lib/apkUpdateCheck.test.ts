import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkForApkUpdate,
  compareVersions,
  pickApkAsset,
  _clearApkUpdateCache,
} from './apkUpdateCheck'

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0)
  })

  it('returns positive when a > b', () => {
    expect(compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0)
    expect(compareVersions('1.1.0', '1.0.9')).toBeGreaterThan(0)
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0)
  })

  it('returns negative when a < b', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0)
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0)
  })

  it('handles "v" prefix on either side', () => {
    expect(compareVersions('v1.2.3', 'v1.2.3')).toBe(0)
    expect(compareVersions('v1.2.4', '1.2.3')).toBeGreaterThan(0)
  })

  it('handles different segment counts', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.0.0.1', '1.0.0')).toBeGreaterThan(0)
  })

  it('treats non-numeric segments as 0 without throwing', () => {
    expect(() => compareVersions('1.0.0-beta', '1.0.0')).not.toThrow()
  })
})

describe('pickApkAsset', () => {
  const asset = (name: string) => ({
    name,
    browser_download_url: `https://example.com/${name}`,
  })

  it('returns null for empty/undefined assets', () => {
    expect(pickApkAsset(undefined)).toBeNull()
    expect(pickApkAsset([])).toBeNull()
  })

  it('returns null when no .apk asset is present', () => {
    expect(pickApkAsset([asset('source.zip'), asset('notes.txt')])).toBeNull()
  })

  it('prefers a signed release APK', () => {
    const picked = pickApkAsset([
      asset('TrueAI-LocalAI-debug.apk'),
      asset('TrueAI-LocalAI-release-unsigned.apk'),
      asset('TrueAI-LocalAI-release.apk'),
    ])
    expect(picked?.name).toBe('TrueAI-LocalAI-release.apk')
  })

  it('falls back to release-unsigned over debug', () => {
    const picked = pickApkAsset([
      asset('TrueAI-LocalAI-debug.apk'),
      asset('TrueAI-LocalAI-release-unsigned.apk'),
    ])
    expect(picked?.name).toBe('TrueAI-LocalAI-release-unsigned.apk')
  })

  it('falls back to any non-debug APK', () => {
    const picked = pickApkAsset([
      asset('TrueAI-LocalAI-debug.apk'),
      asset('app.apk'),
    ])
    expect(picked?.name).toBe('app.apk')
  })

  it('falls back to first APK when only debug exists', () => {
    const picked = pickApkAsset([asset('app-debug.apk')])
    expect(picked?.name).toBe('app-debug.apk')
  })
})

describe('checkForApkUpdate', () => {
  beforeEach(() => {
    _clearApkUpdateCache()
  })

  const makeFetch = (response: unknown, ok = true): typeof fetch =>
    vi.fn(async () => ({
      ok,
      json: async () => response,
    })) as unknown as typeof fetch

  it('returns update info when latest tag is newer', async () => {
    const fetchImpl = makeFetch({
      tag_name: 'v1.0.5',
      html_url: 'https://github.com/x/y/releases/tag/v1.0.5',
      body: 'notes',
      assets: [
        {
          name: 'TrueAI-LocalAI-release.apk',
          browser_download_url: 'https://example.com/release.apk',
        },
      ],
    })
    const result = await checkForApkUpdate({
      currentVersion: '1.0.2',
      fetchImpl,
      force: true,
    })
    expect(result).not.toBeNull()
    expect(result?.tag).toBe('v1.0.5')
    expect(result?.latestVersion).toBe('1.0.5')
    expect(result?.apkUrl).toBe('https://example.com/release.apk')
    expect(result?.apkName).toBe('TrueAI-LocalAI-release.apk')
  })

  it('returns null when up-to-date', async () => {
    const fetchImpl = makeFetch({
      tag_name: 'v1.0.2',
      html_url: 'h',
      assets: [],
    })
    const result = await checkForApkUpdate({
      currentVersion: '1.0.2',
      fetchImpl,
      force: true,
    })
    expect(result).toBeNull()
  })

  it('returns null when latest is older than current', async () => {
    const fetchImpl = makeFetch({
      tag_name: 'v0.9.0',
      html_url: 'h',
      assets: [],
    })
    const result = await checkForApkUpdate({
      currentVersion: '1.0.2',
      fetchImpl,
      force: true,
    })
    expect(result).toBeNull()
  })

  it('skips drafts and prereleases', async () => {
    const draft = makeFetch({
      tag_name: 'v2.0.0',
      html_url: 'h',
      draft: true,
      assets: [],
    })
    expect(
      await checkForApkUpdate({
        currentVersion: '1.0.2',
        fetchImpl: draft,
        force: true,
      })
    ).toBeNull()

    _clearApkUpdateCache()
    const pre = makeFetch({
      tag_name: 'v2.0.0',
      html_url: 'h',
      prerelease: true,
      assets: [],
    })
    expect(
      await checkForApkUpdate({
        currentVersion: '1.0.2',
        fetchImpl: pre,
        force: true,
      })
    ).toBeNull()
  })

  it('returns null when fetch is not ok', async () => {
    const fetchImpl = makeFetch({}, false)
    const result = await checkForApkUpdate({
      currentVersion: '1.0.2',
      fetchImpl,
      force: true,
    })
    expect(result).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    const result = await checkForApkUpdate({
      currentVersion: '1.0.2',
      fetchImpl,
      force: true,
    })
    expect(result).toBeNull()
  })

  it('uses cached result when fresh and same version', async () => {
    const fetchImpl = vi.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            tag_name: 'v1.0.3',
            html_url: 'h',
            assets: [
              {
                name: 'TrueAI-LocalAI-release.apk',
                browser_download_url: 'https://example.com/r.apk',
              },
            ],
          }),
        }) as unknown as Response
    ) as unknown as typeof fetch

    const first = await checkForApkUpdate({
      currentVersion: '1.0.2',
      fetchImpl,
      force: true,
    })
    expect(first).not.toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    // Second call without force should hit cache.
    const second = await checkForApkUpdate({
      currentVersion: '1.0.2',
      fetchImpl,
    })
    expect(second).toEqual(first)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
