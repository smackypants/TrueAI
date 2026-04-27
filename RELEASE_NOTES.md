# TrueAI LocalAI - Release Notes

## Version 1.0.1 - Android Connectivity Fix

**Release Date:** April 27, 2026

### Overview

A maintenance release that fixes the most impactful Android issues from v1.0.0
so that the app's local-AI features actually work on a real device.

### What's Fixed

- **Local AI servers now reachable.** v1.0.0 could not connect to user-hosted
  Ollama / LocalAI servers because Android 9+ blocks cleartext HTTP. The app
  now ships an explicit network security config that permits cleartext only
  for `localhost`, `127.0.0.1`, the Android emulator host (`10.0.2.2`),
  RFC1918 private LAN ranges (`192.168.x.x`, `10.x.x.x`, `172.16.x.x`), and
  `*.local` mDNS hostnames. Public traffic is still HTTPS-only.
- **Online/offline detection.** Added the `ACCESS_NETWORK_STATE` permission so
  the JS layer can correctly observe connectivity changes.
- **Direct Gradle / Android Studio builds.** Added the missing
  `res/values/colors.xml` referenced by `styles.xml`, so building without
  first running `npx cap sync` no longer fails.
- **Versioning.** Bumped `versionCode` to 2 and `versionName` to `1.0.1` so
  installs cleanly upgrade over v1.0.0.

### Installation

Download one of the following APK files from the v1.0.1 GitHub release:

1. **TrueAI-LocalAI-debug.apk** - Debug build for testing
2. **TrueAI-LocalAI-release-unsigned.apk** - Release build (unsigned)

Then enable "Install from Unknown Sources" on your device and open the APK.

---

## Version 1.0.0 - Initial Android Release

**Release Date:** April 27, 2026

### Overview

This is the initial release of TrueAI LocalAI for Android mobile devices. The application provides a comprehensive AI development platform optimized for mobile devices, featuring local AI model management, agent workflows, and advanced analytics.

### Installation

#### Download APK

Download one of the following APK files from the GitHub release:

1. **TrueAI-LocalAI-debug.apk** - Debug version for testing and development
2. **TrueAI-LocalAI-release-unsigned.apk** - Release version (unsigned)

#### System Requirements

- **Android Version:** Android 7.0 (API level 24) or higher
- **Storage:** Approximately 50MB for app installation
- **Additional Storage:** Variable depending on models and data
- **RAM:** Recommended 4GB or more for optimal performance

#### Installation Steps

1. Download the APK file to your Android device
2. Go to **Settings > Security > Unknown Sources** and enable installation from unknown sources
3. Open your file manager and navigate to the downloaded APK
4. Tap the APK file to begin installation
5. Follow the on-screen prompts to complete installation
6. Launch TrueAI LocalAI from your app drawer

### Features

#### Core Features

- **AI Model Management**
  - Browse and download models from Hugging Face
  - GGUF format support
  - Model quantization tools
  - Hardware optimization profiles
  - Performance benchmarking

- **Agent Workflows**
  - Visual workflow builder
  - Drag-and-drop interface
  - Pre-built templates
  - Collaborative agent management
  - Real-time execution monitoring

- **Analytics Dashboard**
  - Performance metrics tracking
  - Usage analytics
  - Cost tracking
  - Model performance comparison
  - Auto-optimization recommendations

- **Chat Interface**
  - Multi-model chat support
  - Conversation management
  - Export conversations
  - Prompt templates
  - Message search and filters

#### Mobile Optimizations

- **Performance**
  - Hardware acceleration enabled
  - Optimized rendering pipeline
  - Lazy loading for improved startup time
  - Virtual scrolling for large lists
  - Image optimization

- **Offline Support**
  - Service Worker for offline functionality
  - IndexedDB caching for persistent storage
  - Offline queue for pending actions
  - Background sync when connection restored

- **Touch Optimizations**
  - Swipe gestures
  - Pull-to-refresh
  - Touch-friendly UI elements
  - Mobile-optimized navigation
  - Bottom navigation bar

- **Responsive Design**
  - Adaptive layouts for all screen sizes
  - Portrait and landscape support
  - Dynamic UI customization
  - Theme support (light/dark modes)

#### Developer Tools

- **App Builder**
  - Generate full-stack applications
  - Multiple framework support (React, Vue, Next.js, etc.)
  - Local IDE with syntax highlighting
  - Code export functionality

- **Harness & Testing**
  - Create custom test harnesses
  - Bundle automation
  - Performance profiling
  - Learning rate benchmarks

### Technical Details

#### Technology Stack

- **Frontend:** React 19 with Vite
- **Mobile Framework:** Capacitor 8.x
- **UI Components:** Radix UI, Tailwind CSS
- **Build Tools:** Gradle, Android SDK
- **Java Version:** JDK 17/21

#### App Configuration

- **Package ID:** com.trueai.localai
- **App Name:** TrueAI LocalAI
- **Version Code:** 1
- **Version Name:** 1.0.0
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 34 (Android 14)
- **Compile SDK:** 34

### Known Issues

1. **Unsigned APK:** The release APK is unsigned. For production distribution, you'll need to sign the APK with your keystore. See [ANDROID_BUILD_GUIDE.md](ANDROID_BUILD_GUIDE.md) for instructions.

2. **Large Bundle Size:** The initial download is approximately 50MB. We're working on code splitting to reduce this in future releases.

3. **Node Version Warning:** The build requires Node.js 24+ for optimal compatibility with all features.

### Documentation

For detailed documentation, see:

- **[ANDROID_BUILD_GUIDE.md](ANDROID_BUILD_GUIDE.md)** - Complete build instructions
- **[ANDROID_IMPLEMENTATION.md](ANDROID_IMPLEMENTATION.md)** - Implementation details
- **[ANDROID_MOBILE_OPTIMIZATIONS.md](ANDROID_MOBILE_OPTIMIZATIONS.md)** - Mobile optimization guide
- **[README.md](README.md)** - General project documentation

### Building from Source

To build the APK from source:

```bash
# Install dependencies
npm install

# Build web app
npm run build

# Sync with Android
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug    # For debug build
./gradlew assembleRelease  # For release build
```

Or use the convenience script:

```bash
./build-android.sh
```

### GitHub Actions Workflow

This release was built using GitHub Actions. The workflow:

1. Builds the React web application
2. Syncs with Capacitor
3. Compiles Android APK (debug and release)
4. Creates GitHub release with APK artifacts

To trigger a new release:

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# Or use workflow dispatch from GitHub Actions UI
```

### Support

For issues, bug reports, or feature requests:

- **GitHub Issues:** https://github.com/smackypants/trueai-localai/issues
- **Documentation:** See markdown files in repository root

### License

MIT License - See [LICENSE](LICENSE) file for details

### Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed change history

---

**Note:** This is an initial release. We welcome feedback and contributions from the community!
