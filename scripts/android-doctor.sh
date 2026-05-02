#!/usr/bin/env bash
#
# scripts/android-doctor.sh — preflight for TrueAI LocalAI Android builds.
#
# Verifies that the host has the toolchain `capacitor-android` requires
# (JDK 21 + Android SDK + Gradle wrapper) before delegating to
# `./android/gradlew`. Surfaces actionable error messages on misconfig
# instead of letting the user discover the failure mid-build.
#
# Exit codes:
#   0 — all preflight checks passed.
#   1 — a required check failed (a clear message is printed).
#
# Intentionally portable POSIX-ish bash; no external deps beyond java,
# javac, and adb (adb is optional — only checked if ANDROID_HOME is set).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

red()    { printf '\033[31m%s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n' "$*"; }

errors=0

fail() {
  red "  ✗ $*"
  errors=$((errors + 1))
}

ok() {
  green "  ✓ $*"
}

warn() {
  yellow "  ⚠ $*"
}

bold "TrueAI LocalAI — Android build preflight"
echo

# --- 1. JDK 21 ----------------------------------------------------------------
echo "[1/4] Java toolchain (Temurin 21 required)"
if ! command -v java >/dev/null 2>&1; then
  fail "java not on PATH. Install Temurin 21 and re-run."
  fail "  hint: export JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64 && export PATH=\$JAVA_HOME/bin:\$PATH"
else
  # `java -version` writes to stderr.
  java_version_raw="$(java -version 2>&1 | head -n1)"
  # Match `"21"` or `"21.0.x"`, etc.
  if printf '%s' "$java_version_raw" | grep -Eq '"(21)(\.|")'; then
    ok "java: $java_version_raw"
  else
    fail "java is on PATH but is NOT JDK 21: $java_version_raw"
    fail "  Capacitor 8 / capacitor-android is compiled with --release 21."
    fail "  JDK 17 fails compileDebugJavaWithJavac with 'invalid source release: 21'."
    fail "  hint: set JAVA_HOME to a Temurin 21 install and put \$JAVA_HOME/bin first on PATH."
  fi
fi

if [ -n "${JAVA_HOME:-}" ]; then
  ok "JAVA_HOME=$JAVA_HOME"
else
  warn "JAVA_HOME is not set. Gradle usually finds java via PATH, but"
  warn "  setting JAVA_HOME explicitly avoids surprises on multi-JDK hosts."
fi

# --- 2. Android SDK -----------------------------------------------------------
echo
echo "[2/4] Android SDK"
sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$sdk_root" ]; then
  fail "Neither ANDROID_HOME nor ANDROID_SDK_ROOT is set."
  fail "  hint: install the Android SDK (Android Studio or 'sdkmanager') and"
  fail "        export ANDROID_HOME=\$HOME/Android/Sdk (Linux) or"
  fail "        export ANDROID_HOME=\$HOME/Library/Android/sdk (macOS)."
elif [ ! -d "$sdk_root" ]; then
  fail "ANDROID_HOME/ANDROID_SDK_ROOT points at '$sdk_root' but the directory does not exist."
else
  ok "ANDROID_HOME=$sdk_root"
  # Best-effort sanity checks — don't fail hard, just warn.
  if [ ! -d "$sdk_root/platforms" ]; then
    warn "  $sdk_root/platforms is missing — install at least 'platforms;android-34' via sdkmanager."
  fi
  if [ ! -d "$sdk_root/build-tools" ]; then
    warn "  $sdk_root/build-tools is missing — install via 'sdkmanager \"build-tools;34.0.0\"'."
  fi
  if [ -x "$sdk_root/platform-tools/adb" ] || command -v adb >/dev/null 2>&1; then
    ok "  adb available"
  else
    warn "  adb not found — install 'platform-tools' via sdkmanager (only needed to install/run the APK)."
  fi
fi

# --- 3. Gradle wrapper --------------------------------------------------------
echo
echo "[3/4] Gradle wrapper"
gradlew="$REPO_ROOT/android/gradlew"
if [ ! -f "$gradlew" ]; then
  fail "android/gradlew not found at $gradlew"
  fail "  hint: did you run 'npx cap add android' or pull the full repo (not a sparse checkout)?"
elif [ ! -x "$gradlew" ]; then
  fail "android/gradlew is not executable. Fix with: chmod +x android/gradlew"
else
  ok "android/gradlew is present and executable"
fi

# --- 4. Capacitor sync state --------------------------------------------------
echo
echo "[4/4] Capacitor web bundle (dist/)"
if [ ! -d "$REPO_ROOT/dist" ]; then
  warn "dist/ does not exist. Run 'npm run build:dev' (or 'npm run build') before"
  warn "  'npm run android:build' so 'cap sync' has something to copy."
else
  ok "dist/ exists ($(du -sh "$REPO_ROOT/dist" 2>/dev/null | cut -f1))"
fi

echo
if [ "$errors" -gt 0 ]; then
  red "android-doctor: $errors preflight check(s) failed."
  exit 1
fi
green "android-doctor: all preflight checks passed."
echo
echo "Next steps:"
echo "  npm run build:dev               # produce dist/ with __APP_DEBUG__=true"
echo "  npm run android:build           # cap sync + assemblePlayDebug"
echo "  adb install -r android/app/build/outputs/apk/play/debug/app-play-debug.apk"
echo "  npm run e2e:android             # optional: run Maestro flows"
exit 0
