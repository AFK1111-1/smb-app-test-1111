# iOS Code Signing Fix - Quick Checklist

## ✅ Pre-Flight Checklist (Before Running Build)

### 1. Verify Match Repository Contents
```bash
git clone git@github.com:insighture/smb-mobile-fastlane.git
cd smb-mobile-fastlane
```

**Check these files exist:**
- [ ] `certs/distribution/*.cer` (Distribution certificate)
- [ ] `certs/distribution/*.p12` (Private key file)
- [ ] `profiles/appstore/AppStore_com.insighture.smbmobile.mobileprovision`

**If missing:** Run `fastlane match appstore --force_for_new_devices`

---

### 2. Verify GitHub Secrets

Go to: **GitHub Repo** → `Settings` → `Secrets and variables` → `Actions`

**Required secrets:**
- [ ] `APP_STORE_CONNECT_API_KEY_ID` - Set and not empty
- [ ] `APP_STORE_CONNECT_ISSUER_ID` - Set and not empty
- [ ] `APP_STORE_CONNECT_API_KEY_BASE64` - Base64 encoded .p8 file
- [ ] `MATCH_PASSWORD` - Encryption password for Match repo
- [ ] `FASTLANE_MATCH_DEPLOY_KEY` - SSH key for Match repo access

**Test AuthKey.p8:**
```bash
echo "$APP_STORE_CONNECT_API_KEY_BASE64" | base64 --decode > test.p8
head -n 1 test.p8  # Should show: -----BEGIN PRIVATE KEY-----
rm test.p8
```

---

### 3. Verify Xcode Project Settings (Local)

**Only if you have local Xcode access:**

1. Open `ios/smbmobile.xcworkspace` in Xcode
2. Select `smbmobile` target
3. Go to **Signing & Capabilities** tab
4. For **Release** configuration:
   - [ ] "Automatically manage signing" is **UNCHECKED**
   - [ ] Team: `Insighture (96W7U4JYV4)`
   - [ ] Provisioning Profile: `match AppStore com.insighture.smbmobile`
   - [ ] Signing Certificate: `iPhone Distribution`

**If changed:** Commit `ios/smbmobile.xcodeproj/project.pbxproj`

---

### 4. Commit and Push Changes

```bash
git status  # Verify what changed
git add fastlane/Fastfile .github/workflows/qa-release.yml
git commit -m "Fix iOS code signing configuration"
git push origin <your-branch>
```

- [ ] Changes committed
- [ ] Changes pushed to GitHub

---

## 🚀 Build Checklist (During Build)

### 1. Trigger GitHub Action

Go to: **GitHub Repo** → `Actions` → `QA Release Build` → `Run workflow`

- [ ] Workflow started successfully
- [ ] Node.js setup completed
- [ ] Dependencies installed
- [ ] Expo prebuild completed
- [ ] CocoaPods install completed

---

### 2. Monitor Code Signing Steps

**Look for these log sections:**

#### A. "Setup SSH for Fastlane Match"
```
✅ SSH key should be created at ~/.ssh/id_rsa
✅ GitHub added to known_hosts
```

#### B. "Create temporary keychain"
```
✅ Keychain created and configured
Current keychains: [shows build.keychain]
```

#### C. "Verify Code Signing Setup" (NEW STEP)
```
🔐 Verifying Code Signing Configuration
=== Certificates in Keychain ===
[Should show: "iPhone Distribution" certificate]

=== Provisioning Profiles Directory ===
✅ Profiles directory exists
Number of profiles: [should be > 0]

=== Checking for App-Specific Profile ===
✅ Profile for com.insighture.smbmobile found!
```

**❌ If you see:** 
- "No certificates found in keychain" → Match failed to install certificates
- "Profile NOT found" → Match failed to install provisioning profile

**→ STOP HERE** - Fix Match repository first

---

#### D. "Build and Release iOS" → Fastlane Match Step
```
📋 Step 2/8: Fetching provisioning profiles and certificates
✅ Provisioning profiles and certificates synced successfully

🔍 Verifying Match installation...
Certificates in keychain: [lists certificates]
Installed provisioning profiles: [lists profiles]
✅ Found X profile(s) for com.insighture.smbmobile
✅ Code signing verification complete
```

**❌ If you see:**
- "No profiles found for com.insighture.smbmobile!" → Match repo is empty/invalid
- "Provisioning Profiles directory does not exist" → System setup issue

---

#### E. "Build and Release iOS" → Update Code Signing Settings
```
📋 Step 3/8: Updating code signing settings
✅ Code signing settings updated
```

---

#### F. "Build and Release iOS" → Build Step
```
📋 Step 6/8: Building iOS app
🔨 Starting xcodebuild...
[Build progress...]
✅ Build completed successfully!
```

**❌ If you see:**
- "error: No Accounts" → Automatic signing is still enabled
- "error: No profiles for 'com.insighture.smbmobile'" → Code signing not configured properly

---

## 🔧 Troubleshooting Quick Fixes

### Issue: "No profiles found" in Match step

**Fix:**
```bash
cd <project-root>
export MATCH_PASSWORD="your-password"
fastlane match appstore --force
git add -A
git commit -m "Regenerate provisioning profiles"
git push
```

---

### Issue: "No Accounts" error persists

**Fix:** Disable automatic signing in Xcode project:

```bash
# Quick command-line fix (macOS only)
cd ios
/usr/libexec/PlistBuddy -c "Set :objects:<BUILD_CONFIGURATION_ID>:buildSettings:CODE_SIGN_STYLE Manual" smbmobile.xcodeproj/project.pbxproj

# Or use Xcode GUI (recommended):
# Open workspace → Select target → Signing & Capabilities → Uncheck automatic signing
```

---

### Issue: SSH key error in Match

**Fix:** Verify and update deploy key:

```bash
# Generate new SSH key
ssh-keygen -t ed25519 -C "github-actions-match" -f match_deploy_key -N ""

# Add match_deploy_key.pub to GitHub:
# Go to Match repo → Settings → Deploy keys → Add deploy key
# ✅ Check "Allow write access"

# Update GitHub secret:
# base64 encode the private key
cat match_deploy_key | base64

# Update FASTLANE_MATCH_DEPLOY_KEY secret with the base64 output
```

---

### Issue: Certificate expired

**Fix:**
```bash
fastlane match nuke distribution  # ⚠️  Removes all certificates
fastlane match appstore            # Creates new ones
```

**⚠️  Warning:** This will invalidate all existing builds. Only do this if necessary.

---

## ✅ Success Indicators

Your build is successful when you see:

1. ✅ All certificates and profiles installed by Match
2. ✅ Verification steps show profile found
3. ✅ Build completes without signing errors
4. ✅ IPA file created: `ios/build/smbmobile.ipa`
5. ✅ Upload to TestFlight succeeds
6. ✅ Build artifacts available for download

---

## 📊 Build Success Logs Example

```
🚀 ============================================
🚀 Starting iOS QA Release Lane
🚀 ============================================

📋 Step 2/8: Fetching provisioning profiles and certificates
✅ Provisioning profiles and certificates synced successfully
✅ Found 1 profile(s) for com.insighture.smbmobile
✅ Code signing verification complete

📋 Step 3/8: Updating code signing settings
✅ Code signing settings updated

📋 Step 6/8: Building iOS app
✅ Build completed successfully!
✅ IPA found at: /path/to/ios/build/smbmobile.ipa (XX.XX MB)

📋 Step 7/8: Uploading to TestFlight
✅ Successfully uploaded to TestFlight!

🎉 ============================================
🎉 iOS QA Release Completed Successfully!
🎉 ============================================
```

---

## 📞 Need Help?

1. **Check detailed guide:** `IOS_CODE_SIGNING_FIX.md`
2. **Review changes made:** `CODE_SIGNING_FIX_APPLIED.md`
3. **Download build logs** from GitHub Actions artifacts
4. **Look for specific error patterns** in the verification steps

---

**Last Updated:** 2025-11-29
**Applied Changes:** Fastfile xcargs, GitHub Actions verification step, Match verification

