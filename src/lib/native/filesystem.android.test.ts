/**
 * Tests for the native (Capacitor Filesystem) path of
 * `native/filesystem.saveTextFile()`. The existing `filesystem.test.ts`
 * only exercises the web blob+anchor download fallback. Here we mock
 * `./platform` as native and `@capacitor/filesystem` so we can assert the
 * Filesystem.writeFile call shape and that the returned URI is propagated
 * back to the caller (used by share() to hand the file to another app).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./platform', () => ({
  isNative: () => true,
  isAndroid: () => true,
  isIOS: () => false,
  getPlatform: () => 'android',
  isPluginAvailable: () => true,
}))

const writeFileMock = vi.fn()

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: (...args: unknown[]) => writeFileMock(...args),
  },
  Directory: { Documents: 'DOCUMENTS' },
  Encoding: { UTF8: 'utf8' },
}))

beforeEach(() => {
  writeFileMock.mockReset()
  vi.resetModules()
})

describe('native/filesystem (Android Capacitor path)', () => {
  it('saveTextFile writes to Documents with the sanitised filename and returns the URI', async () => {
    writeFileMock.mockResolvedValue({ uri: 'file:///storage/emulated/0/Documents/chat_2024.json' })

    const { saveTextFile } = await import('./filesystem')
    const result = await saveTextFile('chat 2024.json', '{"hello":"world"}')

    expect(writeFileMock).toHaveBeenCalledWith({
      path: 'chat_2024.json',
      data: '{"hello":"world"}',
      directory: 'DOCUMENTS',
      encoding: 'utf8',
      recursive: true,
    })
    expect(result).toEqual({
      uri: 'file:///storage/emulated/0/Documents/chat_2024.json',
      filename: 'chat_2024.json',
    })
  })

  it('saveTextFile sanitises path traversal segments before passing them to writeFile', async () => {
    writeFileMock.mockResolvedValue({ uri: 'file:///doc/etc_passwd' })

    const { saveTextFile } = await import('./filesystem')
    const result = await saveTextFile('../../etc/passwd', 'x')

    const call = writeFileMock.mock.calls[0][0] as { path: string }
    expect(call.path).not.toContain('/')
    expect(call.path).not.toContain('..')
    expect(result.filename).toBe(call.path)
  })

  it('saveTextFile propagates a Filesystem.writeFile rejection (caller decides)', async () => {
    writeFileMock.mockRejectedValue(new Error('disk full'))
    const { saveTextFile } = await import('./filesystem')
    await expect(saveTextFile('a.txt', 'x')).rejects.toThrow('disk full')
  })
})
