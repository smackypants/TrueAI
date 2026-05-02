# Testing

> Vitest patterns, jsdom workarounds, Android branch tests, Maestro E2E.
>
> *Audience: developer · Last reviewed: 2026-05-02*

TrueAI uses **Vitest** for unit + component tests, **jsdom** for the
browser environment, and **Maestro** for Android E2E. Test files
live next to the source (`Foo.tsx` → `Foo.test.tsx`).

The patterns below are documented because they recur and are easy to
get wrong — many are encoded as repo memories the agent uses on
every PR.

---

## Running tests

```bash
npm test                  # vitest (interactive)
npm run test:coverage     # one-shot run + coverage
npm run test:ui           # Vitest UI
npm run e2e:android       # maestro test .maestro/
```

`vitest.config.ts` configures jsdom, the `@/` alias, and global
test setup. See `src/test/` for shared helpers.

---

## AI SDK mocks

For tests of code that uses the Vercel AI SDK, import
`mockLanguageModel` / `mockFailingLanguageModel` from
`@/test/ai-sdk-mocks`. They wrap `MockLanguageModelV3` +
`simulateReadableStream` and emit the proper text-delta stream
parts (`stream-start` / `text-start` / `text-delta` / `text-end` /
`finish`).

```ts
import { mockLanguageModel } from '@/test/ai-sdk-mocks'
vi.mock('@/lib/llm-runtime/ai-sdk', () => ({
  getLanguageModel: () => Promise.resolve(mockLanguageModel(['hello world'])),
}))
```

See `src/test/ai-sdk-mocks.ts`,
`src/lib/agent/tool-loop-agent.test.ts`,
`src/hooks/use-streaming-chat.test.ts`.

---

## `useKV` reset (must do per file)

`useKV` keeps an in-memory cache that leaks across tests in the same
file. Always reset:

```ts
import { __resetKvStoreForTests } from '@/lib/llm-runtime/kv-store'
import { kvStore } from '@/lib/llm-runtime/kv-store'

beforeEach(async () => {
  __resetKvStoreForTests()
  for (const key of ['my-keys']) {
    await kvStore.delete(key)
  }
})
```

See `src/components/models/HardwareOptimizer.test.tsx`.

---

## Radix in jsdom

### Tabs

Radix `<TabsTrigger>` only switches reliably when clicked via
`@testing-library/user-event` — `fireEvent.click` does not fire the
pointer events Radix uses to update the active tab.

```ts
const user = userEvent.setup()
await user.click(screen.getByRole('tab', { name: 'Bottlenecks' }))
```

See `src/components/analytics/PerformanceScanPanel.test.tsx`.

### Selects

Locate the trigger via the wired-up label:

```ts
screen.getByRole('combobox', { name: 'Quantization' })
```

Then click an option in the popper:

```ts
screen.getByRole('option', { name: 'Q4_K_M' })
```

…unless the `<Label>` lacks `htmlFor` — then Radix doesn't auto-wire
it, and you have to fall back to placeholder text:

```ts
const trigger = screen.findByText('Select baseline').closest('[role="combobox"]')
```

See `src/components/models/QuantizationTools.test.tsx` and
`BenchmarkRunner.test.tsx`.

### Buttons with hidden alt copy

shadcn buttons that hide alt copy via `hidden sm:inline` +
`sm:hidden` keep both spans in the DOM, so the accessible name
concatenates (e.g. "Start TrainingTrain"). Disambiguate same-label
triggers in dialogs with:

```ts
within(await screen.findByRole('dialog')).getByRole('button', { name: /Start/ })
```

See `src/components/models/FineTuningUI.test.tsx`.

---

## framer-motion `<AnimatePresence>`

Components that render lists inside
`<AnimatePresence mode="popLayout">` need a passthrough mock —
otherwise exiting items remain in the DOM as empty shells and
`queryByText` returns false positives after filter changes:

```ts
vi.mock('framer-motion', async (importActual) => {
  const actual = await importActual<typeof import('framer-motion')>()
  return { ...actual, AnimatePresence: ({ children }) => children }
})
```

See `src/components/analytics/OptimizationRecommendationsViewer.test.tsx`.

---

## File-input synthesis (createElement pattern)

For components that build hidden `<input type="file">` via
`document.createElement`, capture with
`vi.spyOn(document, 'createElement')`, stub `.click()`, then drive
`onchange` directly with a constructed `File` — firing `change` on a
detached input doesn't trigger the handler.

See `src/components/settings/DataSettings.test.tsx`.

---

## URL.createObjectURL stubs

jsdom doesn't implement `URL.createObjectURL` /
`URL.revokeObjectURL`. For component tests that exercise blob
downloads, stub them per-test with `vi.fn()` and restore in
`afterEach`. Patch `HTMLAnchorElement.prototype.click` similarly to
assert programmatic anchor clicks.

See `src/components/models/HuggingFaceModelBrowser.test.tsx`.

---

## Async useEffect + render

When a component calls a mocked async function in `useEffect` on
mount, a synchronous `render()` will leak state updates outside
`act`. Use:

```ts
await act(async () => {
  render(<Component />)
})
```

See `src/components/cache/IndexedDBCacheManager.test.tsx` and
`src/components/notifications/CacheManager.test.tsx`.

---

## Deferred-promise pattern (intermediate state assertions)

For testing async handlers with intermediate state changes (e.g.
"create record with status=running, await, then flip to
status=completed"):

```ts
let resolve!: () => void
const p = new Promise<void>(r => { resolve = r })
mock.mockResolvedValue(p)

await act(async () => {
  // trigger the handler — it's now awaiting `p`
})
expect(/* status === 'running' */)

await act(async () => { resolve() })
expect(/* status === 'completed' */)
```

See `src/components/agent/CollaborativeAgentManager.test.tsx`.

---

## Android branch tests

jsdom can't reach `await import('@capacitor/...')`. Pair every
native module with a `*.android.test.ts`:

```ts
vi.mock('./platform', () => ({
  isNative: () => true,
  isAndroid: () => true,
}))
vi.mock('@capacitor/clipboard', () => ({ Clipboard: { write: vi.fn() } }))

beforeEach(() => vi.resetModules())

it('writes to native clipboard', async () => {
  const { copy } = await import('./clipboard')
  await copy('hi')
  // assert
})
```

See `src/lib/native/installer.android.test.ts`,
`haptics.android.test.ts`, etc.

---

## IndexedDB error arms

For `indexedDBManager` (`src/lib/indexeddb.ts`), exercise the
`reject(request.error)` / `reject(transaction.error)` paths by
init()'ing once, then casting the singleton and swapping `db` for a
fake whose transactions/requests fire `onerror` via
`queueMicrotask`. See `src/lib/indexeddb.branches.test.ts`'s
`installFailingDb` helper.

---

## Confidence-thresholds module mock

When mocking `@/lib/confidence-thresholds`, use `await
vi.importActual` to preserve the `DEFAULT_THRESHOLDS` /
`CONSERVATIVE_*` / `AGGRESSIVE_*` / `BALANCED_*` exports and
replace only the `thresholdManager` singleton:

```ts
vi.mock('@/lib/confidence-thresholds', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/confidence-thresholds')>()
  return {
    ...actual,
    thresholdManager: { setConfig: vi.fn(), getConfig: vi.fn() },
  }
})
```

See `src/components/analytics/AutoOptimizationPanel.test.tsx`.

---

## Maestro E2E (Android)

`.maestro/` contains YAML flows that drive the installed APK.
`docs/MAESTRO_E2E.md` covers setup. Run with:

```bash
npm run e2e:android
```

These run in CI on the `nightly-android.yml` workflow.

---

## See also

- [Build & Release](Build-and-Release)
- [Native Layer](Native-Layer)
- [LLM Runtime](LLM-Runtime)
- Canonical: [`TEST_COVERAGE_SUMMARY.md`](https://github.com/smackypants/TrueAI/blob/main/TEST_COVERAGE_SUMMARY.md), [`docs/MAESTRO_E2E.md`](https://github.com/smackypants/TrueAI/blob/main/docs/MAESTRO_E2E.md)
