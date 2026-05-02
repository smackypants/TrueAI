# Native Layer

> The `src/lib/native/` abstraction that lets the same React app run on the web *and* in a Capacitor 8 Android shell.
>
> *Audience: developer · Last reviewed: 2026-05-02*

Every native capability TrueAI uses (storage, share, haptics,
notifications, filesystem, …) lives behind a JS module that branches
on `isNative()` and falls back to a web API. Call sites import from
`@/lib/native` (barrel) or per-capability files and don't have to
know whether they're running in a browser or an APK.

---

## File layout

```
src/lib/native/
├── platform.ts              # isNative / isAndroid / isIOS
├── platform.test.ts
├── platform.fallback.test.ts
├── install.ts               # side-effect bootstrap (splash, status bar, …)
├── installer.ts             # the meat of install.ts — extracted for testing
├── installer.test.ts
├── installer.android.test.ts
├── secure-storage.ts        # SharedPreferences ↔ IndexedDB
├── secure-storage.android.test.ts
├── network.ts               # @capacitor/network ↔ navigator.onLine
├── network.android.test.ts
├── clipboard.ts             # @capacitor/clipboard ↔ navigator.clipboard
├── clipboard.android.test.ts
├── share.ts                 # @capacitor/share ↔ Web Share API
├── share.android.test.ts
├── haptics.ts               # @capacitor/haptics ↔ navigator.vibrate
├── haptics.android.test.ts
├── app-lifecycle.ts         # @capacitor/app ↔ visibilitychange
├── notifications.ts         # @capacitor/local-notifications ↔ Notification API
├── notifications.android.test.ts
├── filesystem.ts            # @capacitor/filesystem ↔ blob download
├── filesystem.android.test.ts
└── index.ts                 # barrel
```

---

## The branch pattern

Every module follows the same shape:

```ts
import { isNative } from './platform'

export async function copy(text: string) {
  if (isNative()) {
    const { Clipboard } = await import('@capacitor/clipboard')
    await Clipboard.write({ string: text })
    return
  }
  // Web fallback
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  // Last-resort fallback (older WebViews)
  // … execCommand('copy') trick …
}
```

Two important properties:

1. **Capacitor plugin imports are dynamic.** Top-level static
   imports of `@capacitor/...` would break the web build (those
   packages assume the Capacitor runtime exists). Dynamic `await
   import` keeps the web bundle clean.
2. **The web fallback is graceful.** It never throws "not supported"
   if a sensible alternative exists.

---

## `isNative()`

```ts
import { Capacitor } from '@capacitor/core'

export const isNative = () => Capacitor.isNativePlatform()
export const isAndroid = () => Capacitor.getPlatform() === 'android'
```

Both functions are stubbed out by the tests in
`platform.fallback.test.ts` to ensure the web branch is exercised
even in CI where Capacitor isn't loaded.

---

## Bootstrap

`main.tsx` does a side-effect import of `@/lib/native/install`. On
the web this is a no-op. On native it:

1. Sets the status-bar style to match the active theme.
2. Hides the splash screen once React has rendered.
3. Configures keyboard handling (resize / hide on tap-out).
4. Installs the back-button handler stack.

The actual logic is in `installer.ts` so it can be unit-tested.

---

## Back-button stack

```ts
const stack: Array<() => boolean> = []

export function pushBackHandler(handler: () => boolean) {
  stack.push(handler)
  return () => {
    const i = stack.lastIndexOf(handler)
    if (i >= 0) stack.splice(i, 1)
  }
}
```

Components register a handler when they open (returning `true` if
they consumed the back press). The hardware-back listener invokes
the top handler; if none consume, the WebView navigates back; on the
home view the app minimises rather than exits.

---

## Testing the Android branch

jsdom can't reach `await import('@capacitor/...')`, so the
established pattern for native-branch tests is a paired
`*.android.test.ts` file:

```ts
vi.mock('./platform', () => ({
  isNative: () => true,
  isAndroid: () => true,
}))
vi.mock('@capacitor/clipboard', () => ({
  Clipboard: { write: vi.fn() },
}))

beforeEach(() => vi.resetModules())

it('writes to native clipboard', async () => {
  const { copy } = await import('./clipboard')
  await copy('hi')
  // assert on the mock
})
```

See any of the `*.android.test.ts` files for the canonical shape
(e.g. `installer.android.test.ts`, `haptics.android.test.ts`,
`notifications.android.test.ts`, `network.android.test.ts`).

---

## Adding a new capability

1. Create `src/lib/native/foo.ts` with the branch shape above.
2. Add a `foo.test.ts` covering the web branch.
3. Add a `foo.android.test.ts` covering the native branch
   (`vi.mock('./platform')` + `vi.mock('@capacitor/foo')` +
   per-test `vi.resetModules()`).
4. Re-export from `src/lib/native/index.ts`.
5. If the bootstrap should call into it on launch, hook it from
   `installer.ts`.
6. Add the corresponding Capacitor plugin to `package.json` and
   re-run `npx cap sync android`.

---

## See also

- [Architecture Overview](Architecture-Overview)
- [LLM Runtime](LLM-Runtime) — secure storage path
- [Mobile & Android](Mobile-and-Android) — user-facing view
- [Testing](Testing)
- Canonical: [`ANDROID_IMPLEMENTATION.md`](https://github.com/smackypants/TrueAI/blob/main/ANDROID_IMPLEMENTATION.md)
