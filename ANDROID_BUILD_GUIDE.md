# Android APK Build Guide

This document provides comprehensive instructions for building the TrueAI LocalAI app as an Android APK.

## Prerequisites

- Node.js 24+ and npm (installed via nvm recommended)
- Java JDK 21 (required for Capacitor 6.x)
- Android SDK (API level 34 recommended)
- Android Studio (optional, for debugging)

### Installing Node.js with nvm

We recommend using nvm (Node Version Manager) to install and manage Node.js versions. This project requires Node.js 24.

#### Install nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
```

After installation, restart your terminal or run:
```bash
source ~/.bashrc  # or ~/.zshrc for zsh
```

#### Install Node.js 24

```bash
nvm install 24
nvm use 24
```

The project includes a `.nvmrc` file, so you can also run:
```bash
nvm use
```

This will automatically use the Node.js version specified in the `.nvmrc` file.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Web App

```bash
npm run build
```

### 3. Build Android APK

#### Debug APK (for testing)
```bash
npm run android:build
```

The debug APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

#### Release APK (for production)
```bash
npm run android:build:release
```

The release APK will be located at:
```
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Available NPM Scripts

- `npm run android:add` - Add Android platform (only needed once)
- `npm run android:sync` - Build web app and sync with Android
- `npm run android:open` - Open project in Android Studio
- `npm run android:build` - Build debug APK
- `npm run android:build:release` - Build release APK
- `npm run android:run` - Run on connected Android device/emulator

## Configuration

### App Settings

The app configuration is in `capacitor.config.ts`:

```typescript
{
  appId: 'com.trueai.localai',
  appName: 'TrueAI LocalAI',
  webDir: 'dist'
}
```

### Android-Specific Settings

Android settings can be modified in:
- `android/app/build.gradle` - Build configuration
- `android/app/src/main/AndroidManifest.xml` - App permissions and metadata
- `android/app/src/main/res/values/strings.xml` - App name and strings

## Building via GitHub Actions

This repository includes a GitHub Actions workflow that automatically builds the Android APK on push or pull request.

The workflow file is located at: `.github/workflows/build-android.yml`

### Manual Trigger

1. Go to the Actions tab in your GitHub repository
2. Select "Build Android APK" workflow
3. Click "Run workflow"
4. Download the built APK from the workflow artifacts

## Customization

### App Icon

To customize the app icon, replace the images in:
```
android/app/src/main/res/mipmap-*/ic_launcher.png
android/app/src/main/res/mipmap-*/ic_launcher_round.png
```

Or use an online Android icon generator and replace all mipmap folders.

### Splash Screen

Splash screens are located at:
```
android/app/src/main/res/drawable-*/splash.png
```

### App Name

Change the app name in:
```
android/app/src/main/res/values/strings.xml
```

### Package Name

To change the package name (e.g., from `com.trueai.localai`):

1. Update `capacitor.config.ts`
2. Update `android/app/build.gradle` (applicationId)
3. Update `android/app/src/main/res/values/strings.xml`
4. Rename Java package directory structure
5. Update MainActivity.java package declaration

## Signing Release APK

For production release, you need to sign the APK:

### 1. Generate Keystore

```bash
keytool -genkey -v -keystore trueai-release-key.keystore -alias trueai -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Configure Signing

Create `android/key.properties`:
```
storeFile=/path/to/trueai-release-key.keystore
storePassword=your_keystore_password
keyAlias=trueai
keyPassword=your_key_password
```

### 3. Update build.gradle

Add to `android/app/build.gradle`:

```gradle
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Troubleshooting

### Build Fails with "Could not resolve..."

This usually means Gradle can't download dependencies. Try:
```bash
cd android
./gradlew clean
./gradlew assembleDebug --refresh-dependencies
```

### Web Assets Not Updated

Run sync to copy the latest web build:
```bash
npm run android:sync
```

### Android SDK Not Found

Set the ANDROID_HOME environment variable:
```bash
export ANDROID_HOME=/path/to/android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

## Testing

### Install on Device

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Run on Emulator

```bash
npm run android:run
```

## Performance Optimization

The app includes several optimizations for mobile:

- Service Worker for offline support
- IndexedDB caching for large data
- Touch gestures and mobile UI
- Hardware acceleration
- Optimized bundle size

For more details, see:
- `MOBILE_OPTIMIZATION_COMPLETE.md`
- `ANDROID_MOBILE_OPTIMIZATIONS.md`
- `SERVICE_WORKER.md`

## CI/CD Integration

The GitHub Actions workflow automatically:
1. Builds the web app
2. Syncs with Capacitor
3. Builds debug and release APKs
4. Uploads APKs as artifacts

You can download the APKs from the Actions tab after each build.

## License

MIT License - see LICENSE file for details.
