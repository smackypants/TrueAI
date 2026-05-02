# Mobile & Android

> Capacitor 8 wraps the same React app into an Android APK, with native plugins for storage, share, haptics, notifications, and more.
>
> *Audience: end user (with developer notes) · Last reviewed: 2026-05-02*

The Android build is **the same web app**, packaged with
Capacitor 8. There is no separate Android codebase. Native
capabilities are exposed via a thin abstraction in
[`src/lib/native/`](https://github.com/smackypants/TrueAI/tree/main/src/lib/native)
that branches on `isNative()` and falls back to a web API
elsewhere.

---

## Capability matrix

| Capability | Native plugin | Web fallback | Code |
| --- | --- | --- | --- |
| Secure credential storage (LLM API keys) | `@capacitor/preferences` (app-private SharedPreferences) | IndexedDB (**never** localStorage) | `src/lib/native/secure-storage.ts` |
| Network reachability | `@capacitor/network` (OS connectivity manager) | `navigator.onLine` + `online`/`offline` events | `src/lib/native/network.ts` |
| Clipboard | `@capacitor/clipboard` | `navigator.clipboard.writeText` + `execCommand('copy')` fallback | `src/lib/native/clipboard.ts` |
| Share sheet | `@capacitor/share` | Web Share API → clipboard | `src/lib/native/share.ts` |
| Haptic feedback | `@capacitor/haptics` | `navigator.vibrate` | `src/lib/native/haptics.ts` |
| App lifecycle (back, resume) | `@capacitor/app` | `visibilitychange` | `src/lib/native/app-lifecycle.ts` |
| Status bar | `@capacitor/status-bar` | n/a | bootstrap in `installer.ts` |
| Splash screen | `@capacitor/splash-screen` | n/a | bootstrap in `installer.ts` |
| Keyboard handling | `@capacitor/keyboard` | n/a | bootstrap in `installer.ts` |
| Local notifications | `@capacitor/local-notifications` | `Notification` API | `src/lib/native/notifications.ts` |
| File save (chat exports, project zips) | `@capacitor/filesystem` (Documents/) | Blob + anchor download | `src/lib/native/filesystem.ts` |
| Platform detection | `Capacitor.isNativePlatform()` | `false` | `src/lib/native/platform.ts` |

For internals see [Native Layer](Native-Layer).

---

## Bootstrap

`src/lib/native/install.ts` (side-effect imported from `main.tsx`)
configures the splash screen, status bar, keyboard behaviour, and
back-button handler stack on first paint. On the web, it's a no-op.

---

## Back-button handling

The Android hardware back button is wired to a **global handler
stack**:

1. Open dialogs / sheets / drawers register a handler via
   `pushBackHandler(...)`.
2. Pressing back calls the top handler (e.g. close the dialog).
3. If no handler is registered, the WebView navigates back.
4. On the home view, back **minimises** the app (matching standard
   Android behaviour) instead of exiting it.

This avoids the common Capacitor pitfall where the user accidentally
dismisses the entire app while trying to close a modal.

---

## App resume

`onAppResume` (from `app-lifecycle.ts`) fires when the app returns to
the foreground. TrueAI uses this to:

- Flush the [Offline Queue](Offline-and-Sync#offline-queue)
- Re-check connectivity
- Re-sync the conversation list (cheap diff against IndexedDB)

---

## Notifications

`@capacitor/local-notifications` lets agents notify you when long
runs finish, even if the app is backgrounded. The same hook on the
web uses the standard `Notification` API. See
[Notifications](Notifications).

---

## File saves

Chat exports, agent results, and project zips are saved via
`@capacitor/filesystem` to the Android **Documents/** directory
(visible in the Files app). On web, the same abstraction triggers a
standard blob download.

---

## F-Droid considerations

The APK is built specifically to satisfy F-Droid's
[inclusion policy](https://f-droid.org/docs/Inclusion_Policy/):

- No proprietary dependencies
- Reproducible build recipe
- All assets and code under FOSS licenses
- Telemetry / analytics SDKs strictly forbidden

For the audit and build recipe see
[`FDROID.md`](https://github.com/smackypants/TrueAI/blob/main/FDROID.md).

---

## Permissions requested

| Permission | Why |
| --- | --- |
| Internet | To talk to your LLM endpoint |
| Network state | To detect online/offline |
| Vibrate | Haptic feedback |
| Post notifications (Android 13+) | Agent completion alerts |
| Read/write Documents | Chat exports |

No location, microphone, camera, contacts, SMS, or call permissions.
See [Privacy](Privacy) for the full disclosure.

---

## See also

- [Native Layer](Native-Layer) — internals
- [Installation](Installation)
- [Offline & Sync](Offline-and-Sync)
- [Notifications](Notifications)
- [Privacy](Privacy)
- Canonical: [`ANDROID_BUILD_GUIDE.md`](https://github.com/smackypants/TrueAI/blob/main/ANDROID_BUILD_GUIDE.md), [`ANDROID_IMPLEMENTATION.md`](https://github.com/smackypants/TrueAI/blob/main/ANDROID_IMPLEMENTATION.md), [`MOBILE_OPTIMIZATION_COMPLETE.md`](https://github.com/smackypants/TrueAI/blob/main/MOBILE_OPTIMIZATION_COMPLETE.md), [`FDROID.md`](https://github.com/smackypants/TrueAI/blob/main/FDROID.md)
