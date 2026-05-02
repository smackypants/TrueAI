# Build & Release

> Toolchain, build commands, Android packaging, release pipelines, F-Droid distribution.
>
> *Audience: developer · Last reviewed: 2026-05-02*

This page is the operational manual: what to install, what commands
do what, and how releases get cut.

---

## Toolchain (must match exactly)

| Tool | Version | Why this version exactly |
| --- | --- | --- |
| **Node.js** | 24 | `package-lock.json` is generated with Node 24 / npm 11 and includes optional native-binary entries (`@rolldown-*`, `lightningcss-*`, `fsevents`). Older Node fails `npm ci`. |
| **npm** | 11 (bundled with Node 24) | Same as above. |
| **JDK** | Temurin **21** | Capacitor 8 / `capacitor-android` is compiled with `--release 21`. JDK 17 fails `compileDebugJavaWithJavac` with "invalid source release: 21". |
| **Android SDK** | API 34+ | Standard via Android Studio or `sdkmanager`. |

`copilot-setup-steps.yml` pre-installs all of the above for CI. For
shell commands in the agent sandbox, set `JAVA_HOME` per-command:

```bash
JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64 ./android/gradlew ...
```

---

## Web build commands

| Command | What it does |
| --- | --- |
| `npm ci` | Install deps (use this, **not** `npm install`) |
| `npm run dev` | Vite dev server (HMR) on `localhost:5173` |
| `npm run build:dev` | tsc + Vite build with `__APP_DEBUG__=true` |
| `npm run build` | tsc + Vite production build (`__APP_DEBUG__=false`) |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint over the repo |
| `npm run lint:fix` | ESLint with autofix |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run test:coverage` | Vitest + coverage |
| `npm run check:deps` | Knip — unused exports / files / deps |

Debug Android workflows use `build:dev`; release workflows use
`build`. `__APP_DEBUG__` toggles in-app debug surfaces (verbose
logger, perf monitor, dev-only UI hints).

---

## Android build commands

| Command | What it does |
| --- | --- |
| `npm run android:add` | One-time: add the Android Capacitor platform |
| `npm run android:sync` | `build` + `cap sync android` |
| `npm run android:open` | Open Android Studio |
| `npm run android:run` | `sync` then `cap run android` (deploys to a device/emulator) |
| `npm run android:build` | Debug Play APK (uses `build:dev`) — `assemblePlayDebug` |
| `npm run android:build:release` | Release Play APK — `assemblePlayRelease` |
| `npm run android:build:fdroid` | F-Droid release APK — `assembleFdroidRelease` |
| `npm run android:bundle:play` | AAB for Play Store — `bundlePlayRelease` |

There are two product flavors:

- **`play`** — for the Play Store (allows proprietary Play Services
  if needed in future).
- **`fdroid`** — strictly FOSS, satisfies F-Droid's inclusion
  policy.

---

## Runtime config injection

`public/runtime.config.json` is the bake-in point for distribution
defaults (provider preset, base URL, default model). Vite copies it
into `dist/`; `cap sync` includes it in the APK; the app fetches
`/runtime.config.json` at runtime and merges it under any
user-supplied KV overrides. See [LLM Runtime](LLM-Runtime).

---

## Release flows

There are two complementary tag/release workflows:

### `release-bump.yml` — one-shot bump + tag

Actions → **Release Bump (Tag)**. Bumps `package.json`, Android
`versionCode`/`versionName`, prepends a CHANGELOG entry, commits,
tags `vX.Y.Z`, pushes both the commit and the tag.

### `tag-release.yml` — tag-only (version already committed)

Actions → **Tag Release**. Use this when you've already bumped the
version manually in a PR and just need the tag pushed.

Both workflows run as `github-actions[bot]` and require the bot to
be in the bypass list of `protect-default-branch.json` and
`protect-release-tags.json` — see
[`.github/rulesets/`](https://github.com/smackypants/TrueAI/tree/main/.github/rulesets)
and [Governance & Rulesets](Governance-and-Rulesets).

### Downstream of the tag

Pushing a `vX.Y.Z` tag triggers:

- **`release.yml`** — creates the GitHub Release.
- **`build-android.yml`** — assembles `play` and `fdroid` APKs +
  the Play AAB; uploads them to the Release.
- **`fdroid-repo.yml`** — rebuilds the self-hosted F-Droid
  repository at `smackypants.github.io/trueai-localai/fdroid/repo`.
- **`play-release.yml`** — (when configured) uploads the AAB to
  Google Play via Fastlane (`fastlane/`).
- **`publish-release.yml`** — finalises the GH Release.
- **`npm-publish-github-packages.yml`** — publishes the package to
  GitHub Packages (where applicable).

For the full topology, see [CI Workflows](CI-Workflows).

---

## Android signing

The release flow expects keystore secrets in the repo's Actions
secrets. The fdroid flavor uses an unsigned APK by default (F-Droid
signs at distribution time when going through the upstream
catalog).

For a manual signed build:

```bash
JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64 ./android/gradlew assemblePlayRelease \
  -Pandroid.injected.signing.store.file=$KEYSTORE_PATH \
  -Pandroid.injected.signing.store.password=$KEYSTORE_PWD \
  -Pandroid.injected.signing.key.alias=$KEY_ALIAS \
  -Pandroid.injected.signing.key.password=$KEY_PWD
```

See [`ANDROID_BUILD_GUIDE.md`](https://github.com/smackypants/TrueAI/blob/main/ANDROID_BUILD_GUIDE.md)
for the full signing walkthrough.

---

## Definition of done for a release

1. `npm ci` clean.
2. `npm run lint` zero new errors.
3. `npm run build` succeeds.
4. `npm run android:build:release` succeeds.
5. `npm run android:build:fdroid` succeeds.
6. CHANGELOG updated (or release-bump did it for you).
7. CodeQL `Analyze (javascript-typescript)` and `Analyze (java-kotlin)`
   green on `main`.
8. Tag pushed; downstream workflows green.
9. F-Droid repo updated.

---

## See also

- [CI Workflows](CI-Workflows) — every workflow in detail
- [Governance & Rulesets](Governance-and-Rulesets) — protections
- [Testing](Testing)
- [Native Layer](Native-Layer) — Capacitor specifics
- Canonical: [`RELEASE_PROCESS.md`](https://github.com/smackypants/TrueAI/blob/main/RELEASE_PROCESS.md), [`ANDROID_BUILD_GUIDE.md`](https://github.com/smackypants/TrueAI/blob/main/ANDROID_BUILD_GUIDE.md), [`FDROID.md`](https://github.com/smackypants/TrueAI/blob/main/FDROID.md), [`CHANGELOG.md`](https://github.com/smackypants/TrueAI/blob/main/CHANGELOG.md)
