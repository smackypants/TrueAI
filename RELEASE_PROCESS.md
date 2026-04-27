# Creating Releases with APK Packages

This guide explains how to create a new release of TrueAI LocalAI with APK packages for Android installation.

## Automated Release Process

The repository includes a GitHub Actions workflow (`.github/workflows/release.yml`) that automatically builds APK packages and creates a GitHub release.

### Method 1: Create Release via Git Tag (Recommended)

This is the standard way to create releases in GitHub:

1. **Ensure all changes are merged to main branch**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Update version numbers** (if not already done):
   - `package.json` - Update the `version` field
   - `android/app/build.gradle` - Update `versionCode` and `versionName`

3. **Create and push a git tag**
   ```bash
   # Create a new tag (e.g., v1.0.0)
   git tag -a v1.0.0 -m "Release version 1.0.0"

   # Push the tag to GitHub
   git push origin v1.0.0
   ```

4. **Wait for the workflow to complete**
   - Go to the **Actions** tab in GitHub
   - Watch the "Create Release with APK" workflow run
   - The workflow will:
     - Build the web application
     - Sync with Capacitor
     - Build debug and release APKs
     - Create a GitHub release with the APKs attached

5. **Verify the release**
   - Go to the **Releases** section in GitHub
   - Your new release should appear with the APK files attached

### Method 2: Manual Release via GitHub Actions UI

You can also trigger a release manually without creating a tag first:

1. **Go to the Actions tab** in your GitHub repository

2. **Select "Create Release with APK"** workflow from the left sidebar

3. **Click "Run workflow"** button (top right)

4. **Enter the release version** (e.g., `v1.0.0`) in the input field

5. **Click "Run workflow"** to start the build

6. **Wait for completion** - The workflow will:
   - Build the APK packages
   - Create a GitHub release
   - Attach the APK files to the release

## Release Workflow Details

The release workflow performs these steps:

1. **Setup Environment**
   - Checks out code
   - Installs Node.js 24
   - Installs Java JDK 21
   - Sets up Android SDK

2. **Build Application**
   - Installs npm dependencies
   - Builds the React web app
   - Syncs with Capacitor

3. **Build APK Packages**
   - Builds debug APK (`TrueAI-LocalAI-debug.apk`)
   - Builds release APK (`TrueAI-LocalAI-release-unsigned.apk`)

4. **Create GitHub Release**
   - Creates a new release with the version tag
   - Attaches both APK files
   - Includes release notes with installation instructions

## APK Files Explained

### Debug APK (`TrueAI-LocalAI-debug.apk`)
- **Purpose:** Testing and development
- **Signing:** Signed with debug certificate
- **Size:** Larger due to debug symbols
- **Use Case:** Internal testing, development

### Release APK (`TrueAI-LocalAI-release-unsigned.apk`)
- **Purpose:** Production distribution
- **Signing:** Unsigned (needs manual signing for Play Store)
- **Size:** Optimized and smaller
- **Use Case:** Distribution to users, Play Store submission (after signing)

## Signing the Release APK (Optional)

For production distribution via Google Play Store, you need to sign the release APK:

1. **Generate a keystore** (one-time setup):
   ```bash
   keytool -genkey -v -keystore trueai-release-key.keystore \
     -alias trueai -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Sign the APK**:
   ```bash
   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
     -keystore trueai-release-key.keystore \
     app-release-unsigned.apk trueai
   ```

3. **Align the APK**:
   ```bash
   zipalign -v 4 app-release-unsigned.apk app-release-signed.apk
   ```

For detailed signing instructions, see [ANDROID_BUILD_GUIDE.md](ANDROID_BUILD_GUIDE.md).

## Version Numbering

Follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR:** Incompatible API changes
- **MINOR:** New functionality (backward compatible)
- **PATCH:** Bug fixes (backward compatible)

Examples:
- `v1.0.0` - Initial release
- `v1.1.0` - New features added
- `v1.1.1` - Bug fixes
- `v2.0.0` - Breaking changes

## Release Checklist

Before creating a release:

- [ ] All changes merged to main branch
- [ ] Version numbers updated in `package.json` and `android/app/build.gradle`
- [ ] CHANGELOG.md updated with release notes
- [ ] All tests passing
- [ ] Build succeeds locally
- [ ] No security vulnerabilities
- [ ] Documentation updated

After creating a release:

- [ ] Release appears in GitHub Releases
- [ ] APK files are attached to the release
- [ ] Release notes are accurate
- [ ] Download and test the APK files
- [ ] Announce the release (if applicable)

## Troubleshooting

### Build Fails in GitHub Actions

1. **Check the workflow logs** in the Actions tab
2. **Common issues:**
   - Node.js version mismatch
   - Gradle build failures
   - Missing dependencies
   - Android SDK issues

### APK Files Not Attached

1. **Check the workflow completed successfully**
2. **Verify the APK files were built:**
   - Look for "Build Android Debug APK" step
   - Look for "Build Android Release APK" step
3. **Check the "Create Release" step** for errors

### Release Not Created

1. **Verify permissions:**
   - The workflow needs `contents: write` permission
   - Check repository settings > Actions > General
2. **Check if tag already exists:**
   - GitHub won't create duplicate releases for the same tag
3. **Verify the tag format:**
   - Use `v*` format (e.g., `v1.0.0`)

## Manual Release Creation

If the automated workflow fails, you can create a release manually:

1. **Build APKs locally**:
   ```bash
   npm install
   npm run build
   npx cap sync android
   cd android
   ./gradlew assembleDebug assembleRelease
   ```

2. **Create GitHub Release manually:**
   - Go to Releases > Draft a new release
   - Create a new tag (e.g., `v1.0.0`)
   - Add release title and notes
   - Upload APK files:
     - `android/app/build/outputs/apk/debug/app-debug.apk`
     - `android/app/build/outputs/apk/release/app-release-unsigned.apk`
   - Publish release

## CI/CD Integration

The release workflow integrates with:

- **GitHub Actions** - Automated builds
- **Android Build System** - Gradle-based builds
- **Capacitor** - React to native bridge
- **npm** - Dependency management

All configuration is in `.github/workflows/release.yml`.

## Support

For issues or questions:
- Check [ANDROID_BUILD_GUIDE.md](ANDROID_BUILD_GUIDE.md)
- See [RELEASE_NOTES.md](RELEASE_NOTES.md)
- Open an issue on GitHub

---

**Last Updated:** April 27, 2026
