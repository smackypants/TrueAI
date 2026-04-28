/**
 * File save / load helpers. On native we write to the platform Documents
 * directory using the Capacitor Filesystem plugin (the resulting URI can
 * be passed to `share()` so the user can hand the file to another app).
 * On web we fall back to creating an object URL and triggering a download
 * via a hidden anchor — the standard "save file" pattern.
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { isNative } from './platform'

export interface SaveTextFileResult {
  /** Absolute path or object URL where the file lives. */
  uri: string
  /** Suggested filename used. */
  filename: string
}

function sanitiseFilename(name: string): string {
  // Replace any character outside the safe set with `_`, neutralise any
  // `..` parent-directory traversal sequences, strip leading dots/
  // underscores, and trim to a sane length. Falls back to a literal
  // `file` when the input has no alphanumeric content to anchor on.
  const cleaned = name
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/^[._]+/, '')
    .replace(/_+/g, '_')
    .slice(0, 120)
  if (!/[A-Za-z0-9]/.test(cleaned)) return 'file'
  return cleaned
}

function pickMimeType(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.json')) return 'application/json'
  if (lower.endsWith('.md')) return 'text/markdown'
  if (lower.endsWith('.txt')) return 'text/plain'
  if (lower.endsWith('.csv')) return 'text/csv'
  if (lower.endsWith('.html')) return 'text/html'
  return 'application/octet-stream'
}

/**
 * Persist text content to a user-accessible location and return a URI
 * suitable for `share()` (native) or download (web).
 */
export async function saveTextFile(
  filename: string,
  content: string,
): Promise<SaveTextFileResult> {
  const safeName = sanitiseFilename(filename)
  if (isNative()) {
    const result = await Filesystem.writeFile({
      path: safeName,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    return { uri: result.uri, filename: safeName }
  }

  // Web fallback: blob + anchor download.
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('saveTextFile is only available in browser environments')
  }
  const blob = new Blob([content], { type: pickMimeType(safeName) })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Revoke after a tick so the browser has time to start the download.
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }, 1000)
  return { uri: url, filename: safeName }
}
