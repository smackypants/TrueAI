# Maestro E2E for TrueAI LocalAI (Android)

This document covers running the [Maestro](https://maestro.mobile.dev/) end-
to-end smoke flows under `.maestro/` against a local debug build of the
TrueAI LocalAI Android APK. Maestro is invoked as an **external CLI** — it
is intentionally **not** added as an npm dependency, so installing it is a
one-time developer-machine step.

> **Scope.** Phase 3 of [`trueai_upgrade_plan.md`](../trueai_upgrade_plan.md)
> ships only the local-developer E2E loop. Wiring Maestro into GitHub
> Actions is deferred — it would require a hosted Android-emulator runner
> *and* an edit under `.github/**`, both of which are out of scope here.

## Prerequisites

The same toolchain as the rest of the repo (see `.github/copilot-instructions.md`):

| Tool | Version | Notes |
|---|---|---|
| Node.js | 24 (with npm 11) | Required for `npm ci` / `npm run android:build`. |
| JDK | Temurin **21** | Capacitor 8 / `capacitor-android` is compiled with `--release 21`. JDK 17 fails the Gradle build. |
| Android SDK | API 34+ recommended | Used by Gradle and the emulator. Set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`). |
| Android emulator (or device) | API 30+ | Maestro drives whatever device `adb devices` lists first. |
| Maestro CLI | Latest stable | Install instructions below. |

### Install Maestro

Pick one of the official install paths (see <https://maestro.mobile.dev/getting-started/installing-maestro>):

```bash
# Recommended: shell installer (writes to ~/.maestro/bin)
curl -Ls "https://get.maestro.mobile.dev" | bash

# macOS / Homebrew alternative
brew tap mobile-dev-inc/tap
brew install maestro
```

After install, ensure `maestro` is on `PATH`:

```bash
maestro --version
```

### Boot an emulator (or attach a device)

```bash
# List available AVDs
$ANDROID_HOME/emulator/emulator -list-avds

# Boot one (replace <name> with one from the list above)
$ANDROID_HOME/emulator/emulator -avd <name> &

# Verify the device is connected
adb devices
```

A physical device works equally well — enable Developer Options + USB
debugging, then `adb devices` to confirm it shows as `device`.

## Build and install the debug APK

```bash
# From the repo root
JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64 npm run android:build
adb install -r android/app/build/outputs/apk/play/debug/app-play-debug.apk
```

`npm run android:build` runs `build:dev` (so `__APP_DEBUG__=true`),
`cap sync android`, and `gradlew assemblePlayDebug`. Adjust `JAVA_HOME` to
wherever your Temurin 21 JDK lives.

## Run the flows

```bash
npm run e2e:android
```

This is sugar for `maestro test .maestro/`. Maestro discovers the workspace
config (`.maestro/config.yaml`) and runs the four flows in the order listed
there:

1. `01-app-launch.yaml` — boot the APK and confirm the React shell
   reaches the default Chat tab. Catches blank-screen regressions.
2. `02-tab-navigation.yaml` — walk the mobile bottom nav (Chat → Agents →
   Flow → Models). Each tap is followed by an `assertVisible` so the run
   fails fast if `MobileBottomNav` does not flip `activeTab`.
3. `03-open-settings.yaml` — open the Settings dialog via the gear icon
   (matched by its `aria-label="Settings"` content-description) and
   assert both the dialog title and the **LLM Runtime** tab label.
4. `04-llm-runtime-config.yaml` — switch to the **LLM Runtime** tab and
   assert the section heading rendered by `LLMRuntimeSettings.tsx`.

To run a single flow:

```bash
maestro test .maestro/02-tab-navigation.yaml
```

To record a video of a failing run:

```bash
maestro test --format=junit --output=.maestro/.report .maestro/
```

## Conventions

- **YAML only.** No JavaScript / shell hooks, no AI-generated content in
  flows. Each flow is self-contained and deterministic.
- **Each flow re-launches the app** (`launchApp: { clearState: true }`) so
  a single failure does not cascade into later flows.
- **No credential entry.** Phase 3 deliberately avoids touching
  `__llm_runtime_api_key__`. End-to-end credential flows would need a
  debug-only seed hook and are out of scope.
- **No assertions on third-party network responses.** Local-first by
  design — flows must pass with the device in airplane mode.

## Troubleshooting

- **`appId` mismatch.** All flows target `com.trueai.localai`. If you
  build a flavor with a different applicationId, update each flow's
  `appId:` line accordingly.
- **`tapOn: "Settings"` does not find anything.** Maestro matches text
  *and* Android content-description. The header gear button is icon-only
  and exposes its name via `aria-label="Settings"` (see
  `src/App.tsx` ~L1588), which Capacitor's WebView surfaces as a
  content-description. If you have changed that aria-label, update
  `03-open-settings.yaml` to match.
- **Bottom nav labels missing.** `MobileBottomNav` only renders below the
  `lg` breakpoint. Maestro on a phone-sized emulator should see them; on
  a tablet emulator switch to a phone profile or extend the flows to use
  the desktop tab list.
- **Flaky launch.** Increase `launchApp` timeout or precede it with
  `- waitForAnimationToEnd:` if the splash screen is slow on the host.
