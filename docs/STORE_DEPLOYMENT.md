# Store Deployment Guide

This document covers the operator side of releasing TrueAI LocalAI to
**Google Play** and **F-Droid** (both the official `f-droid.org` repo
and the self-hosted GitHub Pages repo). All in-repo plumbing is
already wired; everything below is one-time setup or a per-release
checklist.

---

## 1. Build flavors at a glance

`android/app/build.gradle` defines two product flavors:

| Flavor | Output | Distribution channel | Notes |
|--------|--------|---------------------|-------|
| `play` | `app-play-{debug,release}.apk`, `app-play-release.aab` | Google Play | Picks up `google-services.json` if present |
| `fdroid` | `app-fdroid-{debug,release}.apk` | F-Droid (official + self-hosted), GitHub Releases | Never references Google Services |

Useful Gradle tasks (run from `android/`, with `JAVA_HOME` pointing at
JDK 21):

```bash
./gradlew assemblePlayDebug         # debug APK for Play QA
./gradlew assembleFdroidDebug       # debug APK for F-Droid QA
./gradlew assemblePlayRelease       # release APK (Play flavor)
./gradlew assembleFdroidRelease     # release APK (F-Droid flavor)
./gradlew bundlePlayRelease         # signed AAB for Play
```

When no signing config is wired, release APKs are emitted as
`*-release-unsigned.apk` and the AAB is signed with the debug key —
fine for local inspection, never upload that to Play.

---

## 2. Signing keys

### 2.1 App upload key (Play + sideloaded release APKs + signed F-Droid APK)

Generate **once**, locally, and never commit:

```bash
keytool -genkeypair -v \
  -storetype JKS \
  -keystore upload-keystore.jks \
  -alias trueai-upload \
  -keyalg RSA -keysize 4096 \
  -validity 10000
```

Then base64-encode the keystore so it can be stored as a GitHub
secret:

```bash
base64 -w0 upload-keystore.jks > upload-keystore.b64
```

Store the contents of `upload-keystore.b64` as the secret
`ANDROID_KEYSTORE_BASE64` and add the password / alias / key-password
secrets listed in §3.

> **Recommendation:** use a separate keystore for the F-Droid
> self-hosted repo if you want clean key separation (e.g. so a
> compromised Play upload key doesn't affect F-Droid users). The
> workflows accept either layout — see §3.

### 2.2 F-Droid repo signing key (self-hosted repo only)

The self-hosted F-Droid repo needs a key that signs the **repository
index** (separate from the key that signs the APK). Generate it once
with `fdroidserver`:

```bash
mkdir fdroid-repo-bootstrap && cd fdroid-repo-bootstrap
fdroid init                       # creates keystore.p12 + config.yml
# OR, if you have an existing keystore:
fdroid update --create-key
```

Convert the resulting keystore to base64 (`-w0`) and store as
`FDROID_REPO_KEYSTORE_BASE64`. Note the alias (default: `repo_key`)
and passwords; store those as the matching secrets in §3.

---

## 3. GitHub Actions secrets

Add the following under **Settings → Secrets and variables →
Actions** on the repository:

| Secret | Used by | Purpose |
|--------|---------|---------|
| `ANDROID_KEYSTORE_BASE64` | `play-release.yml`, `fdroid-repo.yml` | Base64 of the app upload keystore |
| `ANDROID_KEYSTORE_PASSWORD` | both | Keystore password |
| `ANDROID_KEY_ALIAS` | both | Alias inside the keystore (e.g. `trueai-upload`) |
| `ANDROID_KEY_PASSWORD` | both | Password for that alias |
| `PLAY_SERVICE_ACCOUNT_JSON` | `play-release.yml` | JSON key for a Google Cloud service account with **Release manager** role on the Play Console app |
| `FDROID_REPO_KEYSTORE_BASE64` | `fdroid-repo.yml` | Base64 of the F-Droid repo index keystore |
| `FDROID_REPO_KEYSTORE_PASSWORD` | `fdroid-repo.yml` | Repo keystore password |
| `FDROID_REPO_KEY_ALIAS` | `fdroid-repo.yml` | Repo key alias (typically `repo_key`) |
| `FDROID_REPO_KEY_PASSWORD` | `fdroid-repo.yml` | Repo key password |

The Play service account is created in
[Google Cloud Console → IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts),
granted the **Service Account User** role, then linked from
[Play Console → Setup → API access](https://play.google.com/console/)
with the **Release manager** role on the app.

---

## 4. Google Play — first-time setup

Play Console must know about the app **before** automation can push
to it. One-time steps:

1. Pay the $25 Play Developer registration fee.
2. Create the app in Play Console with package name
   `com.trueai.localai`. Choose **App** (not game), **Free**, and
   confirm content guidelines.
3. Upload the **first** AAB by hand:
   * Build it locally:
     ```bash
     ANDROID_KEYSTORE_PATH=$PWD/upload-keystore.jks \
     ANDROID_KEYSTORE_PASSWORD=... \
     ANDROID_KEY_ALIAS=trueai-upload \
     ANDROID_KEY_PASSWORD=... \
     npm run android:bundle:play
     ```
   * In Play Console: **Internal testing → Create new release → Upload
     AAB**. Accept Play App Signing enrollment when prompted.
4. Fill in the mandatory store listing using the text from
   [`fastlane/metadata/android/en-US/`](../fastlane/metadata/android/en-US/)
   and add the artwork (icon, feature graphic, ≥2 phone screenshots)
   per [`fastlane/README.md`](../fastlane/README.md).
5. Complete the Data Safety form using §6 below.
6. Set the privacy policy URL to the public URL of
   [`docs/PRIVACY.md`](./PRIVACY.md) (e.g. the GitHub Pages or raw
   GitHub URL).
7. Submit for review. Once approved, **Internal testing** is live and
   subsequent automated uploads will work.

After the first manual upload, push to Play with:

* Actions → **Play Release (Signed AAB → Google Play)** →
  **Run workflow** → pick `track` (`internal` / `alpha` / `beta` /
  `production`) and `status` (`draft` / `completed`).

---

## 5. F-Droid — first-time setup

### 5.1 Official `f-droid.org` repository (recommended for reach)

1. Confirm the metadata file [`metadata/com.trueai.localai.yml`](../metadata/com.trueai.localai.yml)
   reflects the current state (license, source URL, AntiFeatures,
   `CurrentVersion`, latest `Builds:` entry).
2. Fork
   [`fdroid/fdroiddata`](https://gitlab.com/fdroid/fdroiddata) on
   GitLab.
3. Drop the contents of `metadata/com.trueai.localai.yml` into
   `metadata/com.trueai.localai.yml` of the fork.
4. Locally run `fdroid lint com.trueai.localai` and
   `fdroid build --on-server -v -l com.trueai.localai` to validate
   the build recipe.
5. Open a Merge Request against `fdroid/fdroiddata` referencing this
   repository. Address reviewer feedback. Typical timeline: **1–4
   weeks** for first inclusion.
6. After acceptance, every new git tag matching `v*` is automatically
   picked up (`AutoUpdateMode: Version v%v`, `UpdateCheckMode: Tags`).

### 5.2 Self-hosted F-Droid repo (instant updates)

1. Provision the secrets in §3 (the `FDROID_REPO_*` set is required
   in addition to the app-signing set).
2. Enable GitHub Pages for the repo: **Settings → Pages → Source =
   `gh-pages` branch, root**.
3. The `.github/workflows/fdroid-repo.yml` workflow runs on every
   `v*` tag (and on demand via `workflow_dispatch`). It builds the
   signed F-Droid-flavor APK, runs `fdroid update` against a
   `fdroid/repo/` tree, and publishes the result to `gh-pages` along
   with a small landing page at `index.html`.
4. Users add the resulting URL as a custom F-Droid repo:

   ```
   https://smackypants.github.io/trueai-localai/fdroid/repo
   ```

5. F-Droid client matches the repo signing fingerprint on first add;
   confirm it matches the `keystore` fingerprint shown by
   `keytool -list -keystore <repo-keystore.jks>`.

---

## 6. Play Console — Data Safety form

Use these answers verbatim (they match [`docs/PRIVACY.md`](./PRIVACY.md)):

* **Does your app collect or share any of the required user data
  types?** — **No** (the developer collects nothing).
* **Is all of the user data collected by your app encrypted in
  transit?** — Yes (LLM endpoints are accessed over HTTPS; users who
  configure plain HTTP for a LAN endpoint do so explicitly).
* **Do you provide a way for users to request that their data be
  deleted?** — Yes; data lives only on the device and can be cleared
  via Android Settings or by uninstalling.
* **Has your app's data collection and security practices been
  independently validated against a global security standard?** — No.

For **Permissions declarations**:

* `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` justification (Play
  Console asks for this in Policy → App content):

  > The app uses Capacitor Local Notifications to let the user
  > schedule reminders tied to chat content. Exact alarms are needed
  > so reminders fire at the user-specified moment rather than being
  > deferred by Doze. The user explicitly schedules each notification
  > from inside the app; the app does not schedule alarms in the
  > background.

* `POST_NOTIFICATIONS` rationale: same as above; presented to the
  user via the system runtime permission prompt.

---

## 7. Per-release checklist

For every new version `vX.Y.Z`:

1. **Bump + tag**: Actions → **Release Bump (Tag)** → Run workflow
   with `version=X.Y.Z` and a short `notes` line. This:
   * bumps `package.json`, Android `versionName` + `versionCode`,
   * prepends a CHANGELOG entry,
   * writes `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`,
   * updates `metadata/com.trueai.localai.yml` `CurrentVersion` /
     `CurrentVersionCode`,
   * commits and pushes the `vX.Y.Z` tag.
2. **GitHub Release**: `release.yml` runs automatically on the tag,
   builds both-flavor unsigned APKs, attaches them to a Release page.
3. **Self-hosted F-Droid repo**: `fdroid-repo.yml` runs automatically
   on the tag, builds the signed F-Droid APK, refreshes the
   GitHub Pages repo.
4. **Google Play**: Actions → **Play Release** → choose `track`
   (`internal` for smoke-test first; promote in Play Console after
   QA) → Run workflow.
5. **Official F-Droid**: nothing to do — the F-Droid bot picks up the
   new tag via `UpdateCheckMode: Tags` and rebuilds within ~24 h.
6. Add the new versionCode's `changelogs/<code>.txt` to the
   `metadata/com.trueai.localai.yml` `Builds:` list as a new entry
   when the F-Droid bot opens a metadata-update MR.

---

## 8. Verification commands

```bash
# Both flavors compile, both AAB + APK produced:
JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64 \
  android/gradlew -p android \
  assemblePlayDebug assembleFdroidDebug \
  assemblePlayRelease assembleFdroidRelease \
  bundlePlayRelease

# F-Droid flavor must contain ZERO Google services / Firebase deps
# (com.google.guava listenablefuture is OSS Apache-2.0 and is allowed):
android/gradlew -p android :app:dependencies \
  --configuration fdroidReleaseRuntimeClasspath \
  | grep -iE 'play-services|firebase|gms' \
  && echo 'FAIL: GMS dep present' || echo 'OK: no GMS deps'
```
