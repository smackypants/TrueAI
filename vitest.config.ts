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
        // Pragmatic floors set to lock in the gains from PRs #59–#67 and the
        // Phase A–E coverage push (TEST_COVERAGE_SUMMARY.md). The aspirational
        // 80/75 targets are blocked by a handful of large untested screens
        // (`App.tsx`, `AppBuilder.tsx`, `LocalIDE.tsx`) that need
        // decomposition first; tightening these numbers is a follow-up.
        //
        // Phase 1.4 (Master Coverage Roadmap, see docs/COVERAGE_ROADMAP.md):
        // ratcheted up from 65/53/53/63 to the rounded-down current baseline
        // (lines 65.77% · functions 54.05% · branches 54.56% · statements
        // 63.64%) so any future regression fails CI immediately. Subsequent
        // Phase 2 PRs will continue to ratchet these floors upward.
        //
        // Phase 3: ratcheted up from 65.5/54/54/63.5 to the rounded-down
        // Phase 3 baseline (lines 79.52% · functions 68.29% · branches 69.11%
        // · statements 77.27%) — +41 new tests across use-indexeddb-cache,
        // AnalyticsDashboard, ConversationSettings, ModelConfigPanel,
        // AppearanceSettings.
        //
        // Phase 5: ratcheted up from 79/68/69/77 to rounded-down Phase 5
        // baseline (lines 79.76% · functions 68.91% · branches 69.41% ·
        // statements 77.53%) — +57 new tests across NotificationSettings,
        // SettingsMenu, QuickActionsMenu, GGUFLibrary, AdvancedSettings,
        // GeneralSettings, AISettings.
        //
        // Phase 6: ratcheted up from 79/68/69/77 to rounded-down Phase 6
        // baseline (lines 80.08% · functions 69.14% · branches 69.6% ·
        // statements 77.84%) — +17 new branch-coverage tests across
        // IndexedDBCacheManager (formatDate display, cleanup/clear/export
        // error toasts, file-import flow + error + no-file path, mount
        // getCacheStats rejection), CostTracking (exportData blob/anchor
        // flow, createBudget invalid-form early-returns, alertThreshold
        // input incl. NaN fallback, Cancel button), and OfflineQueuePanel
        // (retryFailed failure toast, failed/syncing status badges with
        // retryCount + error rendering, unknown-status fallback).
        // Phase 7: ratcheted up from 80/69/69/77 to rounded-down Phase 7
        // baseline (lines 80.71% · functions 70.58% · branches 70.04% ·
        // statements 78.41%) — +24 new tests across LLMRuntimeSettings
        // (apiKey/defaultModel inputs, temperature/topP/maxTokens with NaN
        // and timeout floor clamps, save error toast, datalist suggestions,
        // truncated >12-models display), DataSettings (import-success branch
        // including spark.kv writes + reload), ServiceWorkerUpdate
        // (updatefound + statechange installed-while-controller branch and
        // null-installing branch), and shadcn primitive smoke tests
        // (Accordion, AspectRatio, Breadcrumb incl. asChild + custom
        // separator, Collapsible, Drawer open with header/footer/close,
        // Pagination with active link + ellipsis, Table full layout,
        // Toggle variants, ToggleGroup with items).
        lines: 80,
        functions: 70,
        branches: 70,
        statements: 78,
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
