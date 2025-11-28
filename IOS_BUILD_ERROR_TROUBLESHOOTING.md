# iOS Build Error Troubleshooting Guide

## Current Issue
The iOS build is failing with exit code 65 and "(2 failures)" but the actual compilation errors are not visible in the GitHub Actions logs.

## What I've Done

### 1. Improved Error Extraction in Workflow
Updated `.github/workflows/qa-release.yml` to better capture and display build errors:
- Added comprehensive error pattern matching for compilation, linker, and module errors
- Improved context extraction around errors (before/after lines)
- Added checking of both `build_output.log` and fastlane logs
- Increased last lines display from 100 to 150

### 2. Enhanced Build Logging
- Added Xcode and SDK version logging before build
- Added `FASTLANE_XCODE_LIST_TIMEOUT` environment variable
- Improved artifact collection to include `build_output.log`

### 3. Updated Fastfile Build Configuration
- Added `-allowProvisioningUpdates` flag to xcargs for better provisioning profile handling

## Next Steps to Diagnose

### Immediate Actions

1. **Download Build Log Artifacts**
   - Go to your failed GitHub Actions run
   - Download the `ios-full-build-output` artifact
   - Download the `ios-build-logs` artifact
   - Open `build_output.log` and search for lines containing "error:"

2. **Re-run the Workflow**
   - The improved error extraction will now show much more detail
   - Commit and push the updated workflow file
   - Trigger a new build to see the enhanced error output

### Common Issues to Check

#### 1. React Native New Architecture Compatibility
Your `app.config.ts` has `newArchEnabled: true`. This can cause issues with:
- Xcode 16.1
- Certain dependencies not yet fully compatible with the New Architecture

**Quick Test**: Try disabling New Architecture temporarily:

```typescript
// In app.config.ts
newArchEnabled: false,  // Changed from true
```

Then:
```bash
npm run prebuild -- --platform ios --clean
cd ios && pod install && cd ..
```

#### 2. Module Precompilation Issues
You have `enableModulePrecompilation: false` in your config, which is good. But you might need additional settings.

**Try updating** `app.config.ts`:

```typescript
['expo-build-properties', {
  ios: {
    useFrameworks: 'static',
    enableModulePrecompilation: false,
    deploymentTarget: '13.4',  // Add this - ensures minimum iOS version
  },
  // ...
}],
```

#### 3. Xcode 16.1 Specific Issues
Your Podfile modification plugin is already configured for Xcode 16.1. But verify it's being applied:

**After next prebuild, check** `ios/Podfile` contains:
```ruby
config.build_settings['CLANG_ENABLE_MODULE_VERIFIER'] = 'NO'
config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
```

#### 4. Firebase Dependencies
You're using Firebase which can have issues with:
- Static frameworks
- New Architecture
- Xcode 16.1

**Check Firebase versions are compatible**:
```bash
cd ios
pod outdated
```

Consider updating to latest:
```json
"@react-native-firebase/app": "^21.6.2",
"@react-native-firebase/messaging": "^21.6.2"
```

#### 5. React Native Worklets
You have `react-native-worklets` which might need special configuration for New Architecture.

#### 6. Kinde SDK
The `@kinde/expo` package might have compatibility issues. Check their docs for Expo SDK 54 support.

## Potential Quick Fixes

### Option 1: Disable New Architecture (Fastest)
```typescript
// app.config.ts
newArchEnabled: false,
```

### Option 2: Update Build Properties
```typescript
['expo-build-properties', {
  ios: {
    useFrameworks: 'static',
    enableModulePrecompilation: false,
    deploymentTarget: '13.4',
    extraPods: [
      { name: 'FirebaseCore', configurations: ['Debug', 'Release'] }
    ],
  },
}],
```

### Option 3: Add Podfile Overrides
Create `ios/Podfile.properties.json`:
```json
{
  "ios.deploymentTarget": "13.4",
  "ios.useFrameworks": "static"
}
```

### Option 4: Clean Everything and Rebuild
```bash
# Clean all build artifacts
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Rebuild
npm run prebuild -- --platform ios --clean
cd ios && pod install --repo-update && cd ..
```

## Testing Locally (Before CI)

If you have a Mac with Xcode 16.1:

```bash
# 1. Clean prebuild
npm run prebuild -- --platform ios --clean

# 2. Install pods
cd ios && pod install && cd ..

# 3. Try building directly
cd ios
xcodebuild -workspace smbmobile.xcworkspace \
  -scheme smbmobile \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  clean build \
  | tee build.log

# 4. Check for errors
grep "error:" build.log
```

## Checking Dependencies Compatibility

Run these to check for known issues:

```bash
# Check for dependency issues
npx expo-doctor

# Check for outdated packages
npm outdated

# Check Expo compatibility
npx expo install --check
```

## Most Likely Issues (in order of probability)

1. **New Architecture incompatibility** with one or more dependencies
2. **Firebase + static frameworks** configuration issue
3. **Xcode 16.1 module precompilation** issue (even with disabled setting)
4. **Code signing** issue (though this usually shows clearer errors)
5. **Missing native dependency** or misconfigured pod

## What to Do Next

1. ✅ **Commit the workflow changes** I made
2. ✅ **Download artifacts** from the failed build to see full errors
3. ✅ **Re-run the workflow** to see improved error output
4. 🔄 **Try disabling New Architecture** if errors point to native modules
5. 🔄 **Update dependencies** if errors show version incompatibilities
6. 🔄 **Test locally** if you have access to a Mac with Xcode 16.1

## Getting the Actual Error

The key is to find the actual error message. Look for patterns like:

```
❌ error: <description>
ld: symbol(s) not found
Undefined symbol: <symbol_name>
No such module '<module_name>'
framework not found <framework_name>
Showing Recent Issues
```

Once you have the actual error message, the fix will be much clearer.

## Support Resources

- [Expo SDK 54 Changelog](https://expo.dev/changelog/2024/11-12-sdk-54)
- [React Native New Architecture](https://reactnative.dev/docs/new-architecture-intro)
- [Expo Build Properties](https://docs.expo.dev/versions/latest/sdk/build-properties/)
- [Fastlane iOS Guide](https://docs.fastlane.tools/getting-started/ios/setup/)

---

**Next Action**: Re-run the GitHub Actions workflow with the improved error extraction to see what the actual compilation errors are.

