/**
 * Network reachability with a unified web + native API.
 *
 * On native platforms this delegates to `@capacitor/network`, which uses
 * the OS connectivity manager and reports correctly even when the WebView
 * fails to fire `online`/`offline` events (a common Android quirk). On
 * web it falls back to `navigator.onLine` plus the `online`/`offline`
 * window events.
 */

import { Network, type ConnectionStatus } from '@capacitor/network'
import { isNative } from './platform'

export interface NetworkStatus {
  connected: boolean
  /** Best-effort connection type; may be 'unknown' on web. */
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown'
}

export type NetworkListener = (status: NetworkStatus) => void

function fromCapacitor(status: ConnectionStatus): NetworkStatus {
  return {
    connected: status.connected,
    connectionType: (status.connectionType as NetworkStatus['connectionType']) ?? 'unknown',
  }
}

function fromBrowser(): NetworkStatus {
  const connected = typeof navigator === 'undefined' ? true : navigator.onLine
  return { connected, connectionType: connected ? 'unknown' : 'none' }
}

let cachedStatus: NetworkStatus | null = null
const listeners = new Set<NetworkListener>()
let initialized = false
let nativeListenerHandle: { remove: () => Promise<void> } | null = null

async function refreshNative(): Promise<NetworkStatus> {
  const s = fromCapacitor(await Network.getStatus())
  cachedStatus = s
  return s
}

function notifyAll(status: NetworkStatus) {
  cachedStatus = status
  for (const l of listeners) {
    try {
      l(status)
    } catch (err) {
      console.error('[native/network] listener threw:', err)
    }
  }
}

async function ensureInitialized(): Promise<void> {
  if (initialized) return
  initialized = true
  if (isNative()) {
    try {
      await refreshNative()
      const handle = await Network.addListener('networkStatusChange', (s) => {
        notifyAll(fromCapacitor(s))
      })
      nativeListenerHandle = handle
    } catch (err) {
      console.error('[native/network] failed to initialise Capacitor network plugin:', err)
    }
  } else if (typeof window !== 'undefined') {
    cachedStatus = fromBrowser()
    window.addEventListener('online', () =>
      notifyAll({ connected: true, connectionType: 'unknown' }),
    )
    window.addEventListener('offline', () =>
      notifyAll({ connected: false, connectionType: 'none' }),
    )
  } else {
    cachedStatus = { connected: true, connectionType: 'unknown' }
  }
}

/** Returns the current status. Async because the native query is async. */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  await ensureInitialized()
  if (cachedStatus) return cachedStatus
  return isNative() ? refreshNative() : fromBrowser()
}

/**
 * Synchronous best-effort snapshot of the current status. Returns the last
 * cached value (after the first listener has fired) or the browser-only
 * default. Useful for `useState` initialisers.
 */
export function getNetworkStatusSync(): NetworkStatus {
  if (cachedStatus) return cachedStatus
  return fromBrowser()
}

/** Convenience: synchronous "are we offline right now". */
export function isOffline(): boolean {
  return !getNetworkStatusSync().connected
}

/**
 * Subscribe to status changes. Fires immediately with the current status
 * on subscribe so callers don't need a separate initial-state path.
 */
export function onNetworkStatusChange(listener: NetworkListener): () => void {
  listeners.add(listener)
  void ensureInitialized().then(() => {
    if (cachedStatus) {
      try {
        listener(cachedStatus)
      } catch {
        // ignore
      }
    }
  })
  return () => {
    listeners.delete(listener)
  }
}

/** Test-only helper: tear down listeners and cached state. */
export async function __resetNetworkForTests(): Promise<void> {
  initialized = false
  cachedStatus = null
  listeners.clear()
  if (nativeListenerHandle) {
    try {
      await nativeListenerHandle.remove()
    } catch {
      // ignore
    }
    nativeListenerHandle = null
  }
}
