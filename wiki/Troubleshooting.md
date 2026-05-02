# Troubleshooting

> Symptom → cause → fix table for the issues that come up most.
>
> *Audience: both · Last reviewed: 2026-05-02*

If your issue isn't here, also check the
[End-User FAQ](FAQ-End-User), the [Developer FAQ](FAQ-Developer),
and the [issue tracker](https://github.com/smackypants/TrueAI/issues).

---

## Install / launch

| Symptom | Cause | Fix |
| --- | --- | --- |
| Blank screen on first load | Service worker cache from an old build | Hard reload (Shift-Reload), or **Application → Storage → Clear site data** in DevTools |
| App won't open after Android update | Cached webview state | Force-stop the app, or clear app cache (Android Settings → Apps → TrueAI → Storage → Clear cache) |
| "App not installed" sideloading the APK | Existing version installed with a different signature | Uninstall the old version first, then sideload |
| F-Droid says "signature mismatch" | Same as above for the F-Droid flavor | Uninstall the GitHub-Releases APK and install the F-Droid one fresh, or vice-versa — flavors are signed differently |

---

## LLM connection

| Symptom | Cause | Fix |
| --- | --- | --- |
| "Test connection" times out | Server not running, or wrong URL, or firewall | Check the server is up; ensure URL ends in `/v1` for OpenAI-compat; check firewall |
| Test works but chat hangs | Streaming not enabled on the server | Most servers support streaming by default; for llama-server, ensure `--api-key` isn't required without a key |
| Models list is empty after Test | Server doesn't expose `/models` endpoint | Set the default model manually in the field; chat will still work |
| 401 / 403 from a hosted provider | Wrong / missing API key | Re-paste the key in Settings → LLM Runtime |
| Works on web but not Android | `localhost` doesn't reach your desktop | Use the LAN IP (`http://192.168.1.10:11434/v1`); ensure server listens on `0.0.0.0` |
| Streaming stutters on LAN | Wi-Fi roaming, or server CPU thrashing | Switch to wired, lower model size, or use a smaller quant |

---

## Service worker / updates

| Symptom | Cause | Fix |
| --- | --- | --- |
| "New version available" banner won't go away | New SW installed but page never reloaded | Click Reload in the banner; if persistent, hard reload |
| Stuck on an old version even after refresh | SW cache poisoning | DevTools → Application → Service Workers → Unregister, then reload |
| SW update loop | Two SWs racing (e.g. preview server + dev server) | Pick one origin and stick to it; clear the other |

---

## Storage

| Symptom | Cause | Fix |
| --- | --- | --- |
| IndexedDB quota errors | Too many large conversations / cached blobs | Settings → Data → wipe non-essential, or use the Cache Manager to purge specific stores |
| Settings reset themselves | KV value failed validation (e.g. renamed tab) | Expected — see the `isTabName` guard pattern in `App.tsx`. Settings repopulate with defaults |
| API key keeps disappearing on Android | App data was cleared from Android Settings | Re-enter the key. Note: the secure path NEVER falls back to localStorage by design |

---

## Android-specific

| Symptom | Cause | Fix |
| --- | --- | --- |
| `compileDebugJavaWithJavac` fails with "invalid source release: 21" | JDK 17 (or older) on PATH | Install Temurin 21 and `export JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64` |
| Capacitor plugin import errors at build time | A `@capacitor/...` package was statically imported | Convert to dynamic `await import()` inside an `if (isNative()) { }` branch — see [Native Layer](Native-Layer) |
| Back button exits the app from a dialog | Component didn't register a back-handler | Use `pushBackHandler(...)` in the dialog's mount effect; return `true` to consume |
| Notifications never appear (Android 13+) | OS notification permission not granted | Settings → Notifications → re-request permission, or Android Settings → Apps → TrueAI → Notifications |
| App minimises but won't return | Aggressive battery optimization | Android Settings → Battery → exempt TrueAI |

---

## Build / dev

| Symptom | Cause | Fix |
| --- | --- | --- |
| `npm ci` fails on rolldown / rollup binaries | Wrong Node version | `nvm use` (picks up `.nvmrc` → Node 24) |
| Vite dev server crashes on save | A test file is failing to load | Check Vitest output; reformat / fix the broken test file |
| `tsc -b` errors out on `__APP_DEBUG__` | Missing global type declaration | The declaration is in `src/vite-end.d.ts` — make sure your tsconfig includes it |
| ESLint reports ~91 warnings | Pre-existing warnings, not your fault | Five new react-hooks rules are demoted to `warn` while we work through them; see `eslint.config.js:58-69` |
| `npm run android:build` fails on `cap sync` | Out-of-sync platform | `npx cap sync android` manually; check `capacitor.config.ts` |

---

## CI

| Symptom | Cause | Fix |
| --- | --- | --- |
| Required check missing on a forked PR | Forks don't run secrets-using workflows | Maintainer needs to re-run with privileges, or land via squash from a maintainer-pushed branch |
| Auto-merge didn't fire | A required check is missing or stale | Check the PR's checks tab; re-run the missing one |
| `dependabot-auto-merge` rejected the PR | Dependabot tried to weaken an `overrides` pin | Manually adjust the bump to keep the pin |
| `learnings-ingest` didn't append my lesson | The `## Lessons learned` section was missing or differently named | Use exactly `## Lessons learned` as a top-level H2 in the PR body |

---

## Performance

| Symptom | Cause | Fix |
| --- | --- | --- |
| App is sluggish | Aggressive profile on weak hardware | Run [Hardware Optimizer](Hardware-Optimizer) → apply Conservative |
| Frame drops during list scrolls | Animation level set too high | Settings → Appearance → Animation level → Reduced/Off |
| Chat tab takes 2+ seconds to switch | Cold-loading the lazy chunk | Enable the prefetch manager (Settings → Advanced); upgrade to a faster connection |

---

## When all else fails

1. **Settings → Advanced → Diagnostics** — copy the diagnostic blob.
2. **Settings → Advanced → Mobile Debug Logger** — capture in-app logs.
3. Open an issue at https://github.com/smackypants/TrueAI/issues
   with the diagnostic blob attached. **Do not** include your API
   key in the report (the export omits it by default; double-check).

For private security reports, see [Security](Security).

---

## See also

- [End-User FAQ](FAQ-End-User)
- [Developer FAQ](FAQ-Developer)
- [Glossary](Glossary)
- [Privacy](Privacy)
