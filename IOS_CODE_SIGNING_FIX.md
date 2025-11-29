# iOS Code Signing Build Failure - Solution Guide

## Problem Summary

Your iOS build is failing with code signing errors:
```
error: No Accounts: Add a new account in Accounts settings
error: No profiles for 'com.insighture.smbmobile' were found
```

## Root Causes

1. **Fastlane Match may not be installing certificates/profiles correctly**
2. **Project may have automatic signing enabled (should be manual for CI)**
3. **Certificates or provisioning profiles may be missing/expired in Match repo**
4. **The `-allowProvisioningUpdates` flag in xcargs might be conflicting**

## Solutions (Try in Order)

### Solution 1: Verify Match Repository Contents

First, verify your Match repository has valid certificates and profiles:

```bash
# Clone your match repository
git clone git@github.com:insighture/smb-mobile-fastlane.git
cd smb-mobile-fastlane

# Check for certificates and profiles
ls -la certs/distribution/
ls -la profiles/appstore/

# Verify the files exist:
# - certs/distribution/*.cer (certificate)
# - certs/distribution/*.p12 (private key)
# - profiles/appstore/AppStore_com.insighture.smbmobile.mobileprovision
```

**If files are missing or expired**, you need to regenerate them:

```bash
# From your project root
fastlane match appstore --force_for_new_devices
# Or to completely regenerate:
fastlane match nuke distribution
fastlane match appstore
```

### Solution 2: Fix Project Code Signing Settings

Your project needs **MANUAL** signing, not automatic. Update the Xcode project:

**Option A: Via Xcode (Local)**
1. Open `ios/smbmobile.xcworkspace` in Xcode
2. Select the `smbmobile` target
3. Go to "Signing & Capabilities" tab
4. **Uncheck** "Automatically manage signing" for Release configuration
5. Set:
   - **Team**: Insighture (96W7U4JYV4)
   - **Provisioning Profile**: "match AppStore com.insighture.smbmobile"
   - **Signing Certificate**: "iPhone Distribution"
6. Commit changes to `ios/smbmobile.xcodeproj/project.pbxproj`

**Option B: Via Command Line (Automated)**

Add this step to your GitHub Actions workflow BEFORE the build step:

```yaml
- name: Force Manual Code Signing
  run: |
    echo "🔐 Configuring manual code signing in Xcode project..."
    
    # Use PlistBuddy to modify project settings
    PBXPROJ="ios/smbmobile.xcodeproj/project.pbxproj"
    
    # Backup the project file
    cp "$PBXPROJ" "${PBXPROJ}.backup"
    
    # Disable automatic code signing for Release
    plutil -replace objects -xml "$(plutil -convert xml1 -o - "$PBXPROJ" | \
      sed 's/ProvisioningStyle = Automatic;/ProvisioningStyle = Manual;/g')" "$PBXPROJ"
    
    echo "✅ Manual code signing configured"
```

### Solution 3: Update Fastfile to Not Use `-allowProvisioningUpdates`

The `-allowProvisioningUpdates` flag can cause Xcode to try to manage profiles automatically, which conflicts with Match.

Update `fastlane/Fastfile` line 336:

**BEFORE:**
```ruby
xcargs: "ONLY_ACTIVE_ARCH=NO ENABLE_BITCODE=NO COMPILER_INDEX_STORE_ENABLE=NO CLANG_ENABLE_MODULE_VERIFIER=NO CLANG_ENABLE_EXPLICIT_MODULES=NO SWIFT_OPTIMIZATION_LEVEL=Onone -allowProvisioningUpdates -UseModernBuildSystem=NO DEVELOPMENT_TEAM=96W7U4JYV4",
```

**AFTER:**
```ruby
xcargs: "ONLY_ACTIVE_ARCH=NO ENABLE_BITCODE=NO COMPILER_INDEX_STORE_ENABLE=NO CLANG_ENABLE_MODULE_VERIFIER=NO CLANG_ENABLE_EXPLICIT_MODULES=NO SWIFT_OPTIMIZATION_LEVEL=Onone -UseModernBuildSystem=NO DEVELOPMENT_TEAM=96W7U4JYV4 CODE_SIGN_STYLE=Manual",
```

### Solution 4: Add Debug Logging to Match

Update your Fastfile to add more debugging around the Match step:

```ruby
# After line 160 in Fastfile, add:
UI.message "🔍 Verifying certificates and profiles were installed..."

# List certificates in keychain
sh("security find-identity -v -p codesigning", log: true)

# List installed provisioning profiles
sh("ls -la ~/Library/MobileDevice/Provisioning\\ Profiles/", log: true)

# Verify the specific profile exists
profile_name = "match AppStore com.insighture.smbmobile"
if sh("ls ~/Library/MobileDevice/Provisioning\\ Profiles/ | grep -c 'AppStore_com.insighture.smbmobile'", log: false).to_i > 0
  UI.success "✅ Provisioning profile found"
else
  UI.error "❌ Provisioning profile NOT found!"
  raise "Provisioning profile missing after Match"
end
```

### Solution 5: Verify GitHub Secrets

Ensure all required secrets are set in your GitHub repository:

**Required Secrets:**
- `APP_STORE_CONNECT_API_KEY_ID` - Your App Store Connect API Key ID
- `APP_STORE_CONNECT_ISSUER_ID` - Your App Store Connect Issuer ID  
- `APP_STORE_CONNECT_API_KEY_BASE64` - Base64 encoded AuthKey_XXXXX.p8 file
- `MATCH_PASSWORD` - Password for Match repository encryption
- `FASTLANE_MATCH_DEPLOY_KEY` - SSH private key with access to Match repo

**To verify the AuthKey.p8 is valid:**
```bash
# Decode and check
echo "$APP_STORE_CONNECT_API_KEY_BASE64" | base64 --decode > test_key.p8
cat test_key.p8  # Should show -----BEGIN PRIVATE KEY-----
```

### Solution 6: Update GitHub Actions Workflow

Add a step to verify Match actually installed the profiles:

```yaml
- name: Verify Code Signing Setup
  run: |
    echo "🔍 Verifying code signing configuration..."
    
    echo "=== Certificates in keychain ==="
    security find-identity -v -p codesigning "${{ env.KEYCHAIN_NAME }}"
    
    echo ""
    echo "=== Provisioning Profiles ==="
    ls -la ~/Library/MobileDevice/Provisioning\ Profiles/ || echo "No profiles directory"
    
    echo ""
    echo "=== Checking for our specific profile ==="
    if ls ~/Library/MobileDevice/Provisioning\ Profiles/*com.insighture.smbmobile*.mobileprovision 2>/dev/null; then
      echo "✅ Profile found!"
      # Show profile details
      PROFILE=$(ls ~/Library/MobileDevice/Provisioning\ Profiles/*com.insighture.smbmobile*.mobileprovision | head -n 1)
      echo "Profile details:"
      security cms -D -i "$PROFILE"
    else
      echo "❌ Profile NOT found!"
      exit 1
    fi
```

Add this step in your workflow AFTER "Setup SSH for Fastlane Match" and BEFORE "Build and Release iOS".

## Quick Fix (Most Likely Solution)

The most common issue is the project file having automatic signing enabled. Here's the fastest fix:

### Update `.github/workflows/qa-release.yml`

Add this step after line 433 (after "Final Verification Before Build"):

```yaml
- name: Configure Manual Code Signing in Project
  run: |
    echo "🔐 Setting manual code signing in Xcode project..."
    cd ios
    
    # Use xcodebuild to set manual signing
    xcrun xcodebuild -project smbmobile.xcodeproj \
      -target smbmobile \
      -configuration Release \
      CODE_SIGN_STYLE=Manual \
      DEVELOPMENT_TEAM=96W7U4JYV4 \
      PROVISIONING_PROFILE_SPECIFIER="match AppStore com.insighture.smbmobile" \
      CODE_SIGN_IDENTITY="iPhone Distribution" \
      -showBuildSettings | grep -E "(CODE_SIGN|PROVISIONING)"
    
    echo "✅ Code signing configured"
```

### Update `fastlane/Fastfile`

Change line 336 from:
```ruby
xcargs: "ONLY_ACTIVE_ARCH=NO ENABLE_BITCODE=NO COMPILER_INDEX_STORE_ENABLE=NO CLANG_ENABLE_MODULE_VERIFIER=NO CLANG_ENABLE_EXPLICIT_MODULES=NO SWIFT_OPTIMIZATION_LEVEL=Onone -allowProvisioningUpdates -UseModernBuildSystem=NO DEVELOPMENT_TEAM=96W7U4JYV4",
```

To:
```ruby
xcargs: "ONLY_ACTIVE_ARCH=NO ENABLE_BITCODE=NO COMPILER_INDEX_STORE_ENABLE=NO CLANG_ENABLE_MODULE_VERIFIER=NO CLANG_ENABLE_EXPLICIT_MODULES=NO SWIFT_OPTIMIZATION_LEVEL=Onone -UseModernBuildSystem=NO DEVELOPMENT_TEAM=96W7U4JYV4 CODE_SIGN_STYLE=Manual PROVISIONING_PROFILE_SPECIFIER='match AppStore com.insighture.smbmobile'",
```

## Testing Locally

To test if Match is working correctly on your local machine:

```bash
# Set up environment variables
export MATCH_PASSWORD="your-match-password"
export APP_STORE_CONNECT_API_KEY_ID="your-key-id"
export APP_STORE_CONNECT_ISSUER_ID="your-issuer-id"

# Create a test keychain
security create-keychain -p test test.keychain
security default-keychain -s test.keychain
security unlock-keychain -p test test.keychain

# Run Match
cd fastlane
bundle exec fastlane match appstore --readonly

# Verify
security find-identity -v -p codesigning test.keychain
ls ~/Library/MobileDevice/Provisioning\ Profiles/

# Cleanup
security delete-keychain test.keychain
```

## Next Steps

1. **Apply the Quick Fix** (update Fastfile line 336 and add workflow step)
2. **Verify Match repo** has valid certificates and profiles
3. **Check GitHub Secrets** are all correctly set
4. **Re-run the GitHub Action**
5. **Check the logs** for the new verification output

If the issue persists, the problem is likely in your Match repository or the certificates/profiles need to be regenerated.

