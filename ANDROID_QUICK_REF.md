# Android Build Quick Reference

## Build Commands

### Using NPM Scripts
```bash
# Build debug APK
npm run android:build

# Build release APK
npm run android:build:release

# Sync changes to Android
npm run android:sync

# Open in Android Studio
npm run android:open

# Run on device/emulator
npm run android:run
```

### Using Build Script
```bash
# Interactive build script
./build-android.sh
```

### Manual Build
```bash
# 1. Build web app
npm run build

# 2. Sync with Capacitor
npx cap sync android

# 3. Build APK
cd android && ./gradlew assembleDebug
```

## APK Locations

- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

## Installation

```bash
# Install on connected device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Install and launch
adb install -r android/app/build/outputs/apk/debug/app-debug.apk && \
adb shell am start -n com.trueai.localai/.MainActivity
```

## GitHub Actions

The repository includes automated builds via GitHub Actions:

1. Go to **Actions** tab
2. Select **Build Android APK**
3. Click **Run workflow**
4. Download APK from artifacts

## Troubleshooting

### Build fails with network error
- Use GitHub Actions to build (has network access)
- Or ensure you have internet access for Gradle dependencies

### APK not installing
- Enable "Install from Unknown Sources" on your device
- Check if an older version is installed and uninstall it first

### Web changes not reflected
```bash
npm run android:sync
```

### Clear build cache
```bash
cd android
./gradlew clean
cd ..
npm run android:build
```

## App Configuration

- **Package ID**: com.trueai.localai
- **App Name**: TrueAI LocalAI
- **Min SDK**: 22 (Android 5.1)
- **Target SDK**: 34 (Android 14)

## Key Files

- `capacitor.config.ts` - Capacitor configuration
- `android/app/build.gradle` - Android build settings
- `android/app/src/main/AndroidManifest.xml` - App manifest
- `.github/workflows/build-android.yml` - CI/CD workflow

## Resources

- Full guide: [ANDROID_BUILD_GUIDE.md](ANDROID_BUILD_GUIDE.md)
- Capacitor docs: https://capacitorjs.com/docs/android
- Android docs: https://developer.android.com/
