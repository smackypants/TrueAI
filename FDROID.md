# F-Droid integration

This document describes how TrueAI LocalAI is distributed via
[F-Droid](https://f-droid.org/), the FOSS Android app catalog, and how to
keep the project compliant with F-Droid's
[inclusion policy](https://f-droid.org/docs/Inclusion_Policy/).

There are two distribution paths and we support **both**:

1. **Self-hosted F-Droid repository** published from this repo to GitHub
   Pages — fast, owner-controlled, ships every tagged release.
2. **Upstream `fdroiddata` submission** to the official F-Droid catalog
   — broad reach, but reviewed by F-Droid maintainers and slower to roll.

Both paths consume the same Fastlane metadata under
[`fastlane/metadata/android/en-US/`](fastlane/metadata/android/en-US/) and
the same Gradle build recipe.

---

## 1. F-Droid suitability — what the app must (not) ship

F-Droid only accepts apps that:

* build from source on F-Droid's CI without network access at build
  time (beyond declared `prebuild` steps);
* contain **no proprietary dependencies** (no Google Play Services, no
  Firebase, no closed-source SDKs, no analytics);
* declare any optional non-free network use as an **Anti-Feature**.

TrueAI LocalAI's current state against that policy:

| Concern | Status |
|---|---|
| Google Play Services (`com.google.gms:google-services`) | Plugin is **only applied if `android/app/google-services.json` is present** (see the `try/catch` block in [`android/app/build.gradle`](android/app/build.gradle)). The file is **not** committed and is removed by F-Droid's build recipe (`rm:` directive). |
| Firebase / Crashlytics / analytics | None — repo contains no `firebase-*`, `crashlytics`, `google-analytics`, or `mixpanel` references. |
| Telemetry | None by default. Error reporting (`src/lib/diagnostics.ts`) is **opt-in** and `errorReporting.endpoint` defaults to empty in [`public/runtime.config.json`](public/runtime.config.json). |
| Default LLM endpoint | `http://localhost:11434/v1` (Ollama on-device). No external network call by default. |
| Bundled non-FOSS assets | None known. App icon and splash are project originals. If you add third-party assets, list their licenses in [`NOTICE`](NOTICE). |
| Native binaries | None — pure JVM Java + Capacitor + WebView. |

### Anti-Features declared

We declare **`NonFreeNet`** in the F-Droid metadata because the user can
optionally point the LLM runtime at a hosted OpenAI-compatible provider
(OpenAI, Anthropic, Together, etc.) via Settings → LLM Runtime. The
**default** configuration is fully local (Ollama on `localhost:11434`),
so this is a *capability* anti-feature, not an *out-of-the-box* one.

No other anti-features apply: there are no ads, no tracking, no upstream
non-free dependencies, no disabled algorithms, no known vulnerabilities
in shipped code.

### Future-proofing checklist for contributors

When changing dependencies, build config, or runtime defaults, please
re-check:

- [ ] No new `com.google.firebase:*`, `com.google.android.gms:*`,
      `com.crashlytics:*`, `com.mixpanel:*`, etc. in `android/app/build.gradle`.
- [ ] No new always-on remote endpoints in `public/runtime.config.json`.
- [ ] No new `.so` / `.aar` files committed under `android/app/libs/`.
- [ ] Non-FOSS assets (icons, fonts) carry a clear license entry in `NOTICE`.
- [ ] If a new optional non-free network feature is added, expand the
      `NonFreeNet` description in
      [`fdroid/upstream/com.trueai.localai.yml`](fdroid/upstream/com.trueai.localai.yml)
      and the self-hosted repo metadata.

---

## 2. Fastlane metadata

F-Droid (and Triple-T's Play Store publisher) auto-ingest app metadata
from `fastlane/metadata/android/<locale>/`. The structure shipped here:

```
fastlane/metadata/android/en-US/
  title.txt                # short app name
  short_description.txt    # one-liner, ≤ 80 chars
  full_description.txt     # main listing copy
  changelogs/
    <versionCode>.txt      # one file per Android versionCode
  images/                  # optional; add icon/feature graphic/screenshots
```

Per-versionCode changelog files are written automatically by the
`Release Bump (Tag)` workflow whenever it bumps the version (see
[`.github/workflows/release-bump.yml`](.github/workflows/release-bump.yml)).
For manual / pre-existing releases, drop a file named
`<versionCode>.txt` (e.g. `8.txt`) into `changelogs/`.

Screenshots and the feature graphic are **optional**. Drop PNGs into
`images/phoneScreenshots/` and `images/featureGraphic.png` to populate
the F-Droid listing — the workflows will pick them up automatically on
the next publish.

---

## 3. Reproducible / signed release APK

For the **self-hosted repo** we sign the APK ourselves (F-Droid's
upstream catalog re-signs APKs with its own key, so the upstream path
does not need a signing key from us).

`android/app/build.gradle` reads the keystore from environment variables
so the secrets stay out of the repo:

| Env var | Purpose |
|---|---|
| `TRUEAI_KEYSTORE_PATH` | Absolute path to the JKS / PKCS#12 keystore. |
| `TRUEAI_KEYSTORE_PASSWORD` | Keystore password. |
| `TRUEAI_KEY_ALIAS` | Key alias inside the keystore. |
| `TRUEAI_KEY_PASSWORD` | Key password. |

When **any** of those env vars is missing the release build falls back
to the standard unsigned `app-release-unsigned.apk` so existing CI flows
in [`release.yml`](.github/workflows/release.yml) and
[`build-android.yml`](.github/workflows/build-android.yml) keep working
unchanged.

Reproducibility helpers applied in [`android/build.gradle`](android/build.gradle):

* `preserveFileTimestamps = false` and `reproducibleFileOrder = true`
  on every `AbstractArchiveTask` (zips/AARs/APKs) so two builds of the
  same source tree produce byte-identical archives modulo signing.
* `compileSdk` / `targetSdk` / `minSdk` / AGP / Gradle wrapper versions
  pinned in `android/variables.gradle` and the wrapper properties.

### Generating a fresh signing keystore

```bash
keytool -genkeypair -v \
  -keystore trueai-fdroid.jks \
  -alias trueai-release \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass "$TRUEAI_KEYSTORE_PASSWORD" \
  -keypass "$TRUEAI_KEY_PASSWORD" \
  -dname "CN=TrueAI LocalAI, OU=Releases, O=Advanced Technology Research, C=US"
```

Encode and stash for CI:

```bash
base64 -w 0 trueai-fdroid.jks > trueai-fdroid.jks.b64
# Add to GitHub Actions secrets:
#   FDROID_KEYSTORE_BASE64        <- contents of trueai-fdroid.jks.b64
#   FDROID_KEYSTORE_PASSWORD      <- $TRUEAI_KEYSTORE_PASSWORD
#   FDROID_KEY_ALIAS              <- trueai-release
#   FDROID_KEY_PASSWORD           <- $TRUEAI_KEY_PASSWORD
```

The **F-Droid repo index** is signed with a *separate* key managed by
`fdroidserver`; the workflow in
[`.github/workflows/fdroid-repo.yml`](.github/workflows/fdroid-repo.yml)
expects:

* `FDROID_REPO_KEYSTORE_BASE64` — base64 of the `fdroid` keystore
* `FDROID_REPO_KEYSTORE_PASSWORD`, `FDROID_REPO_KEY_ALIAS`,
  `FDROID_REPO_KEY_PASSWORD`.

If these are missing the workflow stops short of publishing and uploads
the unsigned APK as a workflow artifact only — useful for testing.

---

## 4. Self-hosted F-Droid repository

On every published release (or manual `workflow_dispatch`), the
`F-Droid Repo` workflow:

1. Builds the signed release APK.
2. Installs `fdroidserver` and assembles an `fdroid/` workspace.
3. Drops the APK into `fdroid/repo/` and the Fastlane metadata into
   `fdroid/metadata/com.trueai.localai/`.
4. Runs `fdroid update -c` to regenerate `index-v1.jar` / `index-v2.json`
   / `entry.jar`.
5. Publishes `fdroid/repo/` to GitHub Pages.

End users add the repository to their F-Droid client:

> **Repository URL**
> `https://smackypants.github.io/trueai-localai/fdroid/repo`
>
> **Fingerprint**
> *(Printed in the workflow logs and uploaded as `repo-fingerprint.txt`
> on the GitHub Release once the keystore is provisioned.)*

A QR-code PNG (`fdroid-repo-qr.png`) is attached to each GitHub Release
so the repo can be added by scanning from the F-Droid client.

---

## 5. Upstream `fdroiddata` submission

The build recipe for F-Droid's official catalog lives in
[`fdroid/upstream/com.trueai.localai.yml`](fdroid/upstream/com.trueai.localai.yml).
This file is **not** consumed by anything in this repo — it's a ready-to-paste
template for the
[`fdroiddata`](https://gitlab.com/fdroid/fdroiddata) MR.

### Submission checklist

1. Fork `https://gitlab.com/fdroid/fdroiddata`.
2. Copy `fdroid/upstream/com.trueai.localai.yml` into
   `metadata/com.trueai.localai.yml` of your fork.
3. Run, from the `fdroiddata` working copy:

   ```bash
   pip install fdroidserver
   fdroid lint com.trueai.localai
   fdroid readmeta
   fdroid rewritemeta com.trueai.localai
   fdroid build -v -l com.trueai.localai
   ```

4. Open a Merge Request against `fdroiddata`.
5. Once the MR is merged, F-Droid CI will build, sign, and publish the
   APK to the official catalog (https://f-droid.org/packages/com.trueai.localai/).
6. For each future release, bump `Builds:`, `CurrentVersion`, and
   `CurrentVersionCode` in the YAML (or rely on `AutoUpdateMode: Version`
   + `UpdateCheckMode: Tags` to do it automatically).

---

## 6. Detecting the F-Droid installer at runtime

The helper [`src/lib/native/installer.ts`](src/lib/native/installer.ts)
exposes `getInstallerSource()` which on Android returns one of
`'fdroid' | 'play' | 'github' | 'sideload' | 'unknown'`. Use it to:

* Show a small "Installed via F-Droid" badge in the About panel.
* Point users at the correct update channel (F-Droid client vs. GitHub
  Releases) when surfacing update hints.

On web it always returns `'web'`.

---

## 7. Validation

Before merging changes that touch any of the surfaces above, please run:

```bash
# Web build
npm ci
npm run build

# Android (unsigned) release APK builds at all
JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64 \
  android/gradlew -p android :app:assembleRelease

# F-Droid metadata syntax
pip install fdroidserver
( cd fdroid/upstream && fdroid lint com.trueai.localai.yml ) || true
```

CI runs all of these on PRs that touch `android/`, `fastlane/`,
`fdroid/`, or the new workflow.
