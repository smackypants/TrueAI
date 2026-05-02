# Installation

> *Audience: end user · Last reviewed: 2026-05-02*

There are four supported ways to install TrueAI LocalAI. Pick the one
that matches your platform and how much you want to manage yourself.

| Path | Best for | Difficulty |
| --- | --- | --- |
| [Web app (run locally)](#1-web-app-run-locally) | Desktops, laptops, anyone who already runs Node / a model server | Easy |
| [Pre-built Android APK](#2-pre-built-android-apk-from-github-releases) | Android phones / tablets, fastest path | Easy |
| [F-Droid (FOSS catalog)](#3-f-droid-foss-android-catalog) | Android, want auto-updates from a trusted FOSS source | Easy |
| [Build from source](#4-build-from-source) | Developers, custom builds, contributing | Medium |

After installing, head to **[First-Run Setup](First-Run-Setup)** to point
the app at an LLM endpoint.

---

## 1. Web app (run locally)

### Prerequisites

- **Node.js 24** — older versions break `npm ci` because the lockfile
  records optional native binaries that newer npm understands. Install
  via [nvm](https://github.com/nvm-sh/nvm); a `.nvmrc` file is checked
  into the repo so `nvm use` picks the right version automatically.

### Steps

```bash
git clone https://github.com/smackypants/TrueAI.git
cd TrueAI
nvm use            # picks up .nvmrc → Node 24
npm ci             # NOT npm install — ci respects the lockfile
npm run dev        # http://localhost:5173
```

For a production-style local build:

```bash
npm run build       # tsc + vite build (production, __APP_DEBUG__=false)
npm run preview     # serves dist/ on http://localhost:4173
```

> See [Build & Release](Build-and-Release) for the full toolchain matrix
> (build:dev vs build, what `__APP_DEBUG__` flips on, etc.).

---

## 2. Pre-built Android APK (from GitHub Releases)

Download the latest signed-or-unsigned APK from the
[GitHub Releases page](https://github.com/smackypants/trueai-localai/releases):

- **TrueAI-LocalAI-debug.apk** — debug build, useful for testing.
- **TrueAI-LocalAI-release-unsigned.apk** — release build (you sign or
  install via "Allow from this source").

Sideload it the usual way (open the file from your phone's file
manager → grant install permission to your browser/file manager →
confirm).

> ⚠️ Android may warn that the APK is from an "unknown developer" —
> that's expected for self-distributed FOSS apps. The signing
> certificate fingerprint is published with each release for
> verification.

See [`RELEASE_NOTES.md`](https://github.com/smackypants/TrueAI/blob/main/RELEASE_NOTES.md)
for per-release install notes.

---

## 3. F-Droid (FOSS Android catalog)

TrueAI LocalAI ships through F-Droid, which gives you signed updates,
no Google Play Services dependency, and a verified-build pipeline.

### Self-hosted F-Droid repository (gets every release first)

In the F-Droid client → **Settings → Repositories → Add new repository**:

```
https://smackypants.github.io/trueai-localai/fdroid/repo
```

The repository fingerprint and a QR code are attached to each
[GitHub Release](https://github.com/smackypants/trueai-localai/releases).

### Upstream F-Droid catalog

After the upstream merge request lands, the app will also appear at:

```
https://f-droid.org/packages/com.trueai.localai/
```

For the full F-Droid story — build recipe, suitability audit,
reproducibility — see
[`FDROID.md`](https://github.com/smackypants/TrueAI/blob/main/FDROID.md).

---

## 4. Build from source

### Prerequisites

| Tool | Version | Why this version exactly |
| --- | --- | --- |
| Node.js | **24** | npm 11 lockfile entries (`@rolldown-*`, `lightningcss-*`, `fsevents`) require it |
| npm | **11** (bundles with Node 24) | same |
| JDK | **Temurin 21** | Capacitor 8 / `capacitor-android` is compiled with `--release 21`; JDK 17 fails `compileDebugJavaWithJavac` |
| Android SDK | API 34+ | Standard via Android Studio or `sdkmanager` |

### Web build

```bash
npm ci
npm run build            # production
# or
npm run build:dev        # development build with __APP_DEBUG__=true
```

### Android APK

```bash
# Always set JAVA_HOME for Android commands (CI does this too)
export JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64

npm run android:build            # debug Play APK (uses build:dev)
npm run android:build:release    # release Play APK (uses build)
npm run android:build:fdroid     # F-Droid release APK
npm run android:bundle:play      # AAB for Play Store
```

The full step-by-step (signing, keystore, troubleshooting) lives in
[`ANDROID_BUILD_GUIDE.md`](https://github.com/smackypants/TrueAI/blob/main/ANDROID_BUILD_GUIDE.md)
and the deeper rationale in
[`ANDROID_IMPLEMENTATION.md`](https://github.com/smackypants/TrueAI/blob/main/ANDROID_IMPLEMENTATION.md).

---

## Verifying the install

After install, open the app. You should see:

1. The tabbed UI (Chat is the default tab).
2. The footer/header status indicator (online/offline + storage status).
3. **Settings → LLM Runtime** — this is where you'll connect to a model
   server. Continue to **[First-Run Setup](First-Run-Setup)**.

<!-- SCREENSHOT: app first-launch home screen -->

---

## See also

- [First-Run Setup](First-Run-Setup) — required to actually chat with a model
- [System Requirements](System-Requirements)
- [Mobile & Android](Mobile-and-Android)
- [Troubleshooting](Troubleshooting) → install issues
- Canonical: [`README.md`](https://github.com/smackypants/TrueAI/blob/main/README.md), [`ANDROID_BUILD_GUIDE.md`](https://github.com/smackypants/TrueAI/blob/main/ANDROID_BUILD_GUIDE.md), [`FDROID.md`](https://github.com/smackypants/TrueAI/blob/main/FDROID.md)
