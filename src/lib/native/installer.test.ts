import { describe, it, expect } from 'vitest'
import {
  classifyInstallerPackage,
  getInstallerSource,
  isInstalledFromFDroid,
} from './installer'

describe('native/installer', () => {
  describe('classifyInstallerPackage', () => {
    it('maps the F-Droid client and its privileged extension to "fdroid"', () => {
      expect(classifyInstallerPackage('org.fdroid.fdroid')).toBe('fdroid')
      expect(classifyInstallerPackage('org.fdroid.fdroid.privileged')).toBe(
        'fdroid',
      )
    })

    it('maps Play Store package ids to "play"', () => {
      expect(classifyInstallerPackage('com.android.vending')).toBe('play')
      expect(classifyInstallerPackage('com.google.android.feedback')).toBe('play')
    })

    it('maps the system package installer to "sideload"', () => {
      expect(classifyInstallerPackage('com.android.packageinstaller')).toBe(
        'sideload',
      )
      expect(
        classifyInstallerPackage('com.google.android.packageinstaller'),
      ).toBe('sideload')
    })

    it('treats null / undefined / empty / unknown ids as "sideload"', () => {
      expect(classifyInstallerPackage(null)).toBe('sideload')
      expect(classifyInstallerPackage(undefined)).toBe('sideload')
      expect(classifyInstallerPackage('')).toBe('sideload')
      expect(classifyInstallerPackage('com.example.unknown.installer')).toBe(
        'sideload',
      )
    })
  })

  describe('getInstallerSource (web jsdom)', () => {
    it('returns "web" under jsdom', async () => {
      await expect(getInstallerSource()).resolves.toBe('web')
    })

    it('isInstalledFromFDroid is false on web', async () => {
      await expect(isInstalledFromFDroid()).resolves.toBe(false)
    })
  })
})
