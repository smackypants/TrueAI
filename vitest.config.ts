import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
      thresholds: {
        // Phase 2A ratchet (see trueai_upgrade_plan.md): pinned to the
        // recorded baseline (Stmts 63.92 / Branch 54.81 / Funcs 54.31 /
        // Lines 66.06), rounded down. The aspirational 80/75 targets are
        // blocked by a handful of large untested screens (`App.tsx`,
        // `AppBuilder.tsx`, `LocalIDE.tsx`) that need decomposition first;
        // future phases may only ratchet these numbers up, never down.
        lines: 66,
        functions: 54,
        branches: 54,
        statements: 63,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Mirror the Vite alias so tests that import components which use
      // `useKV` from `@github/spark/hooks` resolve to the local IndexedDB-
      // backed shim instead of the published Spark dist bundle (which reads
      // `import.meta.env.DEV` in a way that throws under Vitest).
      '@github/spark/hooks': resolve(__dirname, 'src/lib/llm-runtime/spark-hooks-shim.ts'),
      '@github/spark/spark': resolve(__dirname, 'src/lib/llm-runtime/install.ts'),
    }
  },
})
