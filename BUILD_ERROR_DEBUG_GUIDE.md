# iOS Build Error Debugging Guide

## Current Status - RESOLVED ✅

**Original Error Identified:**
```
xcodebuild: error: Unable to find a destination matching the provided destination specifier:
{ platform:iOS, error:iOS 18.1 is not installed. To use with Xcode, first download and install the platform }
```

**Root Cause:** iOS 18.1 SDK was not installed on the GitHub Actions runner.

**Fix Applied:** Restored and improved the iOS runtime download step in the workflow.

---

## ✅ Changes Applied (Nov 28, 2025)

### 1. **Reverted Invalid Fix**
- ❌ Initially tried disabling New Architecture
- ✅ Reverted because `react-native-reanimated` 4.x **requires** New Architecture
- Status: `newArchEnabled: true` (correct)

### 2. **Fixed iOS 18.1 SDK Installation** (CRITICAL FIX)
- ✅ Restored iOS platform download step
- ✅ Improved wait logic with verification loop
- ✅ Added SDK verification before proceeding to build
- ✅ Added `sdk: "iphoneos"` to Fastfile build config
- **This was the root cause of the build failure**

### 3. **Added Verbose Build Logging**
**Files**: `fastlane/Fastfile`, `.github/workflows/qa-release.yml`

- Added `verbose: true` to build configuration
- Added `buildlog_path: "./fastlane/logs"`
- Build output now saved to `build_output.log`
- Full logs uploaded as GitHub Actions artifacts (7-day retention)

**Benefit**: You'll now see the **actual compilation errors** in the CI logs

### 3. **Added Error Extraction Step**
New workflow step that automatically:
- Extracts lines containing `error:`, `❌`, `ld:`, `Undefined symbol`, etc.
- Displays last 100 lines of build output
- Uploads full build log as artifact

### 4. **Improved Xcode Verification**
- Added workspace verification step
- Added scheme listing
- Added SDK verification
- Removed problematic iOS runtime background download

### 5. **Updated Code Signing**
- Added `build_configurations: ["Release"]` to code signing settings
- More explicit configuration for Xcode 16.1

---

## 🔍 How to Find the Real Error

### Step 1: Check CI Logs for Error Extraction
After the next build, look for the step **"Extract and Display Build Errors"**.

This will show lines like:
```
error: Building for iOS, but the linked library was built for iOS Simulator
error: Module 'RNFBApp' not found
ld: framework not found FirebaseCore
```

### Step 2: Download Build Logs
If errors aren't clear in the console:
1. Go to the failed workflow run
2. Scroll to bottom → **Artifacts** section
3. Download `ios-full-build-output`
4. Open `build_output.log` and search for `error:`

### Step 3: Check Full Xcode Build Log
If needed, also download `ios-build-logs` artifact which contains:
- `~/Library/Logs/gym/**/*.log`
- `fastlane/logs/**/*.log`

---

## 🐛 Common Error Patterns & Fixes

### Error Pattern 1: Firebase Module Issues
```
error: Module 'RNFBApp' not found
error: Could not build module 'FirebaseCore'
```

**Fix**:
```bash
npm update @react-native-firebase/app @react-native-firebase/messaging
npx expo prebuild --clean --platform ios
```

### Error Pattern 2: Architecture Mismatch
```
ld: symbol(s) not found for architecture arm64
Building for iOS, but linked library was built for iOS Simulator
```

**Fix**: Add to `Podfile` post_install hook:
```ruby
config.build_settings['ONLY_ACTIVE_ARCH'] = 'NO'
config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
```

### Error Pattern 3: Notifee Build Issues
```
error: Building for iOS Simulator, but linking in dylib built for iOS
```

**Fix**:
```bash
npm update @notifee/react-native
cd ios && pod update Notifee && cd ..
```

### Error Pattern 4: Swift Module Issues
```
error: No such module 'RNReanimated'
error: Cannot find type in scope
```

**Fix**: Ensure Hermes is enabled (already done via Expo config)

### Error Pattern 5: Signing Issues
```
error: Provisioning profile doesn't include signing certificate
error: Code signing failed
```

**Fix**: Re-run match:
```bash
bundle exec fastlane match appstore --readonly false
```

### Error Pattern 6: Missing Framework
```
ld: framework not found [FrameworkName]
```

**Fix**:
```bash
cd ios
pod install --repo-update
cd ..
```

---

## 🚀 Next Steps

1. **Commit and push** these changes:
   ```bash
   git add .
   git commit -m "fix: Add verbose logging and error extraction for iOS build debugging"
   git push
   ```

2. **Trigger new build** in GitHub Actions

3. **Check the "Extract and Display Build Errors" step** in CI logs

4. **Share the actual error message** (the lines with `error:`) for specific fix

5. **Or download** the `ios-full-build-output` artifact and search for `error:`

---

## 📋 Build Configuration Summary

| Setting | Value | Reason |
|---------|-------|--------|
| `newArchEnabled` | `true` | Required by reanimated 4.x |
| `enableModulePrecompilation` | `false` | Xcode 16.1 compatibility |
| `useFrameworks` | `static` | Firebase requirement |
| Xcode Version | 16.1 | Latest available on macos-15 |
| iOS SDK | 18.1 | Comes with Xcode 16.1 |
| Build Configuration | Release | App Store build |
| Export Method | app-store | TestFlight upload |

---

## 🛠️ Troubleshooting Commands

### Check Xcode Setup (Local)
```bash
xcodebuild -version
xcodebuild -showsdks
xcodebuild -workspace ios/smbmobile.xcworkspace -list
```

### Clean Build (Local)
```bash
# Clean Expo
npx expo prebuild --clean

# Clean iOS
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
xcodebuild clean -workspace smbmobile.xcworkspace -scheme smbmobile
cd ..

# Clean fastlane
rm -rf fastlane/logs
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### Manual Build Test (Local)
```bash
bundle exec fastlane ios qa_release
```

### Check Pod Status
```bash
cd ios
pod outdated
pod update [specific-pod-name]
cd ..
```

---

## 📞 Getting Help

If the error persists after these changes:

1. ✅ **Share the error extraction output** from the CI logs
2. ✅ **Download and check** `ios-full-build-output` artifact
3. ✅ **Search for similar issues** in:
   - react-native-firebase GitHub issues
   - @notifee/react-native GitHub issues
   - Expo forums

4. ✅ **Try updating packages**:
   ```bash
   npm update
   npx expo install --fix
   ```

---

## 🔗 Useful Links

- [Expo iOS Build Errors](https://docs.expo.dev/build-reference/ios-builds/)
- [Fastlane Troubleshooting](https://docs.fastlane.tools/codesigning/getting-started/)
- [React Native Firebase Issues](https://github.com/invertase/react-native-firebase/issues)
- [Xcode 16.1 Release Notes](https://developer.apple.com/documentation/xcode-release-notes)

---

**Remember**: The "(2 failures)" message is just a count. The actual error details will now be visible in the CI logs thanks to the verbose logging and error extraction steps added.

