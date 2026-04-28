import { describe, it, expect } from 'vitest'
import {
  FRAMEWORK_CONFIGS,
  getFrameworkConfig,
  getFrameworkPromptInstructions,
} from './framework-configs'

describe('framework-configs', () => {
  describe('FRAMEWORK_CONFIGS', () => {
    it('exposes the expected frameworks', () => {
      expect(FRAMEWORK_CONFIGS.map(f => f.id)).toEqual(['vanilla', 'react', 'vue', 'svelte'])
    })

    it('every framework has a name, description, icon, color, file structure, build instructions, and features', () => {
      for (const cfg of FRAMEWORK_CONFIGS) {
        expect(cfg.name).toEqual(expect.any(String))
        expect(cfg.description).toEqual(expect.any(String))
        expect(cfg.icon).toEqual(expect.any(String))
        expect(cfg.color).toEqual(expect.any(String))
        expect(cfg.fileStructure.length).toBeGreaterThan(0)
        expect(cfg.buildInstructions.length).toBeGreaterThan(0)
        expect(cfg.features.length).toBeGreaterThan(0)
      }
    })

    it('every framework declares at least one required file', () => {
      for (const cfg of FRAMEWORK_CONFIGS) {
        expect(cfg.fileStructure.some(f => f.required)).toBe(true)
      }
    })
  })

  describe('getFrameworkConfig', () => {
    it('returns the matching framework config by id', () => {
      const react = getFrameworkConfig('react')
      expect(react?.name).toBe('React')
    })

    it('returns undefined for an unknown framework id', () => {
      expect(getFrameworkConfig('angular')).toBeUndefined()
      expect(getFrameworkConfig('')).toBeUndefined()
    })
  })

  describe('getFrameworkPromptInstructions', () => {
    it('returns React-specific instructions for react', () => {
      const out = getFrameworkPromptInstructions('react')
      expect(out).toMatch(/React 19/)
      expect(out).toMatch(/TypeScript/)
    })

    it('returns Vue-specific instructions for vue', () => {
      const out = getFrameworkPromptInstructions('vue')
      expect(out).toMatch(/Composition API/)
      expect(out).toMatch(/<script setup/)
    })

    it('returns Svelte-specific instructions for svelte', () => {
      const out = getFrameworkPromptInstructions('svelte')
      expect(out).toMatch(/Svelte/)
      expect(out).toMatch(/script lang="ts"/)
    })

    it('returns vanilla-JS instructions for vanilla', () => {
      const out = getFrameworkPromptInstructions('vanilla')
      expect(out).toMatch(/vanilla JavaScript/i)
      expect(out).toMatch(/ES6\+/)
    })

    it('returns an empty string when the framework is unknown', () => {
      expect(getFrameworkPromptInstructions('angular')).toBe('')
    })
  })
})
