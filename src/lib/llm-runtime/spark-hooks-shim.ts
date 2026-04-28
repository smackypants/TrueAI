/**
 * Vite alias target for `@github/spark/hooks`. Re-exports the local `useKV`
 * implementation so existing imports across the app
 * (`import { useKV } from '@github/spark/hooks'`) resolve without any
 * source changes.
 */

export { useKV } from './use-kv'
