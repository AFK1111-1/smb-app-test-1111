# iOS Prebuild & Build Troubleshooting Guide

## Overview
This guide helps troubleshoot issues related to missing iOS project files during CI/CD builds.

## Common Issue: iOS Project Files Not Found

### Symptoms
```
❌ Workspace NOT found: ios/smbmobile.xcworkspace
❌ Project NOT found: ios/smbmobile.xcodeproj
❌ Podfile NOT found
⚠️  Podfile.lock NOT found
⚠️  Pods directory NOT found
```

### Root Cause
The iOS native project files are missing because:
1. **Expo Prebuild hasn't run** - The workflow step was skipped or failed
2. **Prebuild failed silently** - Errors weren't caught and the workflow continued
3. **Wrong working directory** - Commands ran from an incorrect location
4. **Insufficient disk space** - Prebuild couldn't complete

## Solution Applied

### 1. Enhanced Prebuild Step
Added comprehensive error checking and verification:

```yaml
- name: Expo Prebuild for iOS
  run: |
    echo "🔨 Starting Expo Prebuild for iOS..."
    npm run prebuild -- --platform ios
    
    echo "✅ Prebuild completed, verifying iOS directory..."
    if [ ! -d "ios" ]; then
      echo "❌ ERROR: ios directory was not created!"
      exit 1
    fi
    
    if [ ! -d "ios/smbmobile.xcworkspace" ] && [ ! -d "ios/smbmobile.xcodeproj" ]; then
      echo "❌ ERROR: Neither workspace nor project was created!"
      exit 1
    fi
    
    echo "✅ iOS project structure verified"
    ls -la ios/
```

### 2. Enhanced CocoaPods Step
Added verification after pod install:

```yaml
- name: Install CocoaPods dependencies
  run: |
    echo "📦 Installing CocoaPods dependencies..."
    cd ios
    pod install
    cd ..
    
    echo "✅ CocoaPods installation completed"
    echo "📁 Verifying workspace..."
    if [ -d "ios/smbmobile.xcworkspace" ]; then
      echo "✅ Workspace verified: ios/smbmobile.xcworkspace"
    else
      echo "❌ ERROR: Workspace not found after pod install!"
      exit 1
    fi
```

### 3. Verification Script
Created `scripts/verify-ios-setup.sh` that checks:
- ✅ iOS directory exists
- ✅ Xcode workspace exists
- ✅ Xcode project exists
- ✅ Podfile exists
- ✅ Pods directory exists
- ✅ Key CocoaPods are installed
- ✅ Firebase configuration files
- ✅ Build tools (Node, npm, Xcode, CocoaPods, Fastlane)
- ✅ Environment variables

### 4. Fastlane Fail-Fast Check
Updated Fastfile to fail immediately if required files are missing:

```ruby
# Fail-fast checks for critical files
puts "\n🔍 Running fail-fast checks..."
missing_items = []

unless File.exist?("ios/smbmobile.xcworkspace")
  missing_items << "ios/smbmobile.xcworkspace"
end

unless File.exist?("ios/smbmobile.xcodeproj")
  missing_items << "ios/smbmobile.xcodeproj"
end

# ... more checks ...

unless missing_items.empty?
  puts "\n❌ CRITICAL ERROR: Missing required iOS project files:"
  missing_items.each { |item| puts "  - #{item}" }
  UI.user_error!("iOS project files are missing. Please run prebuild before building.")
end
```

### 5. Pre-Build Verification Step
Added a verification step right before Fastlane runs:

```yaml
- name: Verify iOS Build Prerequisites
  run: |
    echo "🔍 Verifying iOS build prerequisites..."
    
    # Check iOS directory
    if [ ! -d "ios" ]; then
      echo "❌ FATAL: ios directory does not exist!"
      exit 1
    fi
    
    # ... more checks ...
```

## Workflow Order

The correct order of operations in the CI/CD workflow:

1. **Checkout code** ✅
2. **Setup Node.js** ✅
3. **Install npm dependencies** ✅
4. **Setup Ruby & Fastlane** ✅
5. **Setup environment variables** ✅
6. **Setup credentials** (keystores, API keys) ✅
7. **Run Expo Prebuild** ⭐ (Generates iOS native files)
8. **Verify prebuild output** ⭐ (NEW)
9. **Install CocoaPods** ⭐
10. **Verify CocoaPods installation** ⭐ (NEW)
11. **Run verification script** ⭐ (NEW)
12. **Setup SSH for Match** ✅
13. **Setup Xcode** ✅
14. **Create keychain** ✅
15. **Verify prerequisites** ⭐ (NEW - final check)
16. **Run Fastlane build** ✅

⭐ = Critical iOS-specific steps

## Local Testing

### Run Verification Script Locally
```bash
# Make script executable
chmod +x scripts/verify-ios-setup.sh

# Run verification
./scripts/verify-ios-setup.sh
```

### Manual Prebuild & Setup
```bash
# 1. Clean previous builds (optional)
rm -rf ios/

# 2. Run prebuild
npm run prebuild -- --platform ios

# 3. Install CocoaPods
cd ios
pod install
cd ..

# 4. Verify setup
./scripts/verify-ios-setup.sh

# 5. Test Fastlane (if configured)
fastlane ios qa_release
```

## Common Errors & Solutions

### Error: "expo: command not found"
**Solution:** Ensure dependencies are installed
```bash
npm ci
```

### Error: "pod: command not found"
**Solution:** Install CocoaPods
```bash
sudo gem install cocoapods
```

### Error: "No such file or directory - ios/Podfile"
**Solution:** Run prebuild first
```bash
npm run prebuild -- --platform ios
```

### Error: "Unable to load contents of file list: 'ios/Pods/...' (in target 'xxx' from project 'xxx')"
**Solution:** Reinstall pods
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

### Error: "The workspace 'smbmobile' does not contain a scheme named 'smbmobile'"
**Solution:** Check if workspace was created correctly
```bash
# List available schemes
xcodebuild -workspace ios/smbmobile.xcworkspace -list
```

## Prevention Best Practices

### 1. Always Verify After Each Step
Each critical step should verify its output before continuing.

### 2. Fail Fast
If a step fails, the workflow should stop immediately with a clear error message.

### 3. Use Verification Scripts
Run comprehensive checks before expensive operations (like builds).

### 4. Log Everything
Use `echo` statements to provide visibility into what's happening.

### 5. Test Locally First
Before pushing workflow changes, test the build process locally:
```bash
# Simulate CI environment
rm -rf ios/
npm ci
npm run prebuild -- --platform ios
cd ios && pod install && cd ..
./scripts/verify-ios-setup.sh
```

## Monitoring in CI/CD

### What to Look For in Logs

✅ **Good Signs:**
```
🔨 Starting Expo Prebuild for iOS...
✅ Prebuild completed, verifying iOS directory...
✅ iOS project structure verified
📦 Installing CocoaPods dependencies...
✅ CocoaPods installation completed
✅ Workspace verified: ios/smbmobile.xcworkspace
✅ All checks passed!
🔍 Running fail-fast checks...
✅ All critical files present
```

❌ **Warning Signs:**
```
❌ ERROR: ios directory was not created!
❌ ERROR: Neither workspace nor project was created!
❌ ERROR: Workspace not found after pod install!
❌ FATAL: ios directory does not exist!
❌ CRITICAL ERROR: Missing required iOS project files
```

## Additional Resources

- [Expo Prebuild Documentation](https://docs.expo.dev/workflow/prebuild/)
- [CocoaPods Troubleshooting](https://guides.cocoapods.org/using/troubleshooting.html)
- [Fastlane Documentation](https://docs.fastlane.tools/)
- [Xcode Build Settings](https://developer.apple.com/documentation/xcode)

## Related Files

- `.github/workflows/qa-release.yml` - Main CI/CD workflow
- `scripts/verify-ios-setup.sh` - Verification script
- `fastlane/Fastfile` - Fastlane configuration with fail-fast checks
- `app.config.ts` - Expo configuration
- `package.json` - npm scripts including prebuild

## Support

If you encounter issues not covered in this guide:

1. Run the verification script: `./scripts/verify-ios-setup.sh`
2. Check the CI/CD logs for error messages
3. Review the Fastlane diagnostic output (at the start of the build)
4. Check that all environment variables are set correctly
5. Verify that all secrets are configured in GitHub

## Changelog

### 2025-11-30
- ✅ Added comprehensive error checking to prebuild step
- ✅ Added CocoaPods installation verification
- ✅ Created iOS setup verification script
- ✅ Added fail-fast checks in Fastlane
- ✅ Added pre-build verification step in workflow
- ✅ Enhanced Xcode clean step with safety checks
- ✅ Created this troubleshooting guide

