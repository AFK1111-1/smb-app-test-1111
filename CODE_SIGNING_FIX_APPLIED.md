# iOS Code Signing Fix - Changes Applied

## 🔴 Problem Identified

Your iOS build failed with these critical errors:
```
error: No Accounts: Add a new account in Accounts settings
error: No profiles for 'com.insighture.smbmobile' were found
```

**Root Cause:** The Xcode build process couldn't find proper code signing certificates and provisioning profiles, even though Fastlane Match was attempting to install them.

## ✅ Changes Applied

### 1. Fixed Fastfile Code Signing Arguments

**File:** `fastlane/Fastfile` (Line 336)

**BEFORE:**
```ruby
xcargs: "... -allowProvisioningUpdates -UseModernBuildSystem=NO DEVELOPMENT_TEAM=96W7U4JYV4",
```

**AFTER:**
```ruby
xcargs: "... -UseModernBuildSystem=NO DEVELOPMENT_TEAM=96W7U4JYV4 CODE_SIGN_STYLE=Manual PROVISIONING_PROFILE_SPECIFIER='match AppStore com.insighture.smbmobile' CODE_SIGN_IDENTITY='iPhone Distribution'",
```

**Why:** 
- Removed `-allowProvisioningUpdates` which conflicts with manual code signing
- Added `CODE_SIGN_STYLE=Manual` to force manual signing
- Explicitly specified the provisioning profile and signing identity

### 2. Added Code Signing Verification in Fastfile

**File:** `fastlane/Fastfile` (After line 160)

Added comprehensive verification after Fastlane Match runs:
- Lists all certificates in the keychain
- Lists all installed provisioning profiles
- Verifies the specific profile for your app exists
- Fails fast if profiles are missing

**Benefits:**
- Catches code signing issues immediately after Match runs
- Provides clear error messages if something is wrong
- Shows exactly what certificates and profiles are available

### 3. Added Verification Step to GitHub Actions Workflow

**File:** `.github/workflows/qa-release.yml` (New step after "Final Verification Before Build")

Added a new step: **"Verify Code Signing Setup"**

This step checks:
- ✅ Certificates in keychain
- ✅ Provisioning profiles directory exists
- ✅ App-specific profile is present
- ✅ Xcode project code signing settings
- ✅ Profile expiration and team ID

**Benefits:**
- Validates code signing before Fastlane runs
- Provides detailed logs for debugging
- Creates provisioning profiles directory if missing

## 📋 What These Changes Fix

1. **Prevents automatic signing conflicts** - Forces manual signing throughout the build
2. **Early detection** - Catches missing profiles before the build fails
3. **Better debugging** - Detailed logs show exactly what's available
4. **Explicit configuration** - No ambiguity in which profile/identity to use

## 🚀 Next Steps

### Immediate Actions Required

1. **Verify Your Match Repository Has Valid Certificates**
   
   ```bash
   # Clone your match repository
   git clone git@github.com:insighture/smb-mobile-fastlane.git
   cd smb-mobile-fastlane
   
   # Check for required files
   ls -la certs/distribution/
   ls -la profiles/appstore/
   ```
   
   **Required files:**
   - `certs/distribution/*.cer` (Distribution certificate)
   - `certs/distribution/*.p12` (Private key)
   - `profiles/appstore/AppStore_com.insighture.smbmobile.mobileprovision`

   **If missing, regenerate:**
   ```bash
   cd <your-project-root>
   fastlane match appstore --force_for_new_devices
   ```

2. **Verify GitHub Secrets Are Set**
   
   Go to: `Settings` → `Secrets and variables` → `Actions`
   
   Required secrets:
   - ✅ `APP_STORE_CONNECT_API_KEY_ID`
   - ✅ `APP_STORE_CONNECT_ISSUER_ID`
   - ✅ `APP_STORE_CONNECT_API_KEY_BASE64`
   - ✅ `MATCH_PASSWORD`
   - ✅ `FASTLANE_MATCH_DEPLOY_KEY`

3. **Commit and Push These Changes**
   
   ```bash
   git add fastlane/Fastfile .github/workflows/qa-release.yml
   git commit -m "Fix iOS code signing configuration
   
   - Remove -allowProvisioningUpdates flag that conflicts with manual signing
   - Add explicit CODE_SIGN_STYLE=Manual and profile specifier
   - Add verification steps to check certificates and profiles
   - Improve logging for debugging code signing issues"
   
   git push origin <your-branch>
   ```

4. **Re-run the GitHub Action**
   
   Go to: `Actions` → `QA Release Build` → `Run workflow`

5. **Check the New Verification Logs**
   
   Look for these sections in the build logs:
   ```
   🔐 Verifying Code Signing Configuration
   === Certificates in Keychain ===
   === Provisioning Profiles Directory ===
   === Checking for App-Specific Profile ===
   ```
   
   This will tell you exactly what's available for code signing.

## 🔍 Troubleshooting

### If Build Still Fails with "No Profiles"

**Most likely cause:** Your Match repository doesn't have valid certificates/profiles.

**Solution:**
```bash
# From your project root
export MATCH_PASSWORD="your-match-password"
export APP_STORE_CONNECT_API_KEY_ID="your-key-id"
export APP_STORE_CONNECT_ISSUER_ID="your-issuer-id"

# Regenerate certificates and profiles
fastlane match appstore --force

# Or if you need to completely start over:
fastlane match nuke distribution
fastlane match appstore
```

### If Build Fails with "Certificate not valid"

**Cause:** Certificate expired or was revoked.

**Solution:**
```bash
# Remove and regenerate
fastlane match nuke distribution
fastlane match appstore
```

### If Match Step Fails with SSH Error

**Cause:** SSH key doesn't have access to Match repository.

**Solution:**
1. Generate a new deploy key with write access
2. Add it to your Match repository: `Settings` → `Deploy keys`
3. Update `FASTLANE_MATCH_DEPLOY_KEY` secret in GitHub

### If "No Accounts" Error Persists

**Cause:** Project file still has automatic signing enabled.

**Solution:** Manually disable automatic signing in Xcode:
1. Open `ios/smbmobile.xcworkspace`
2. Select `smbmobile` target
3. Go to "Signing & Capabilities"
4. **Uncheck** "Automatically manage signing" for Release
5. Set Team: `Insighture (96W7U4JYV4)`
6. Commit `ios/smbmobile.xcodeproj/project.pbxproj`

## 📝 Additional Resources

- **Full Solution Guide:** `IOS_CODE_SIGNING_FIX.md`
- **Fastlane Match Docs:** https://docs.fastlane.tools/actions/match/
- **Code Signing Guide:** https://codesigning.guide/

## ✨ Expected Outcome

After these changes, your build should:
1. ✅ Successfully run Fastlane Match
2. ✅ Install certificates and provisioning profiles
3. ✅ Verify they're available before building
4. ✅ Build with manual code signing
5. ✅ Archive and export the IPA successfully
6. ✅ Upload to TestFlight

The new verification steps will provide clear feedback if anything is wrong with your code signing setup.

---

**Questions or issues?** Check the detailed solution guide in `IOS_CODE_SIGNING_FIX.md`

