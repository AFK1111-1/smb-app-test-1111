# Quick Debug Guide - Finding Your iOS Build Error

## 🚀 TL;DR - What to Do Right Now

1. **Commit and push** the updated workflow and Fastfile:
   ```bash
   git add .github/workflows/qa-release.yml fastlane/Fastfile
   git commit -m "Add comprehensive logging for iOS build debugging"
   git push
   ```

2. **Trigger the workflow** in GitHub Actions

3. **Look for these emoji** in the logs to track progress:
   - 🔐 = Code signing setup
   - 📱 = iOS configuration
   - 🔨 = Building
   - 📦 = Dependencies
   - ✅ = Success
   - ❌ = Failure
   - ⚠️  = Warning

4. **When it fails**, scroll to the "Extract and Display Build Errors" step

5. **Find the actual error** in this section (it will be much more visible now)

## 🔍 What to Look For in the Error Output

### Error Section 1: Compilation Errors
```
🔍 === COMPILATION ERRORS ===
Found 2 error lines:
```
**These are your actual code errors** - missing files, syntax errors, etc.

### Error Section 2: Linker Errors
```
🔗 === LINKER ERRORS ===
```
**Symbol not found, duplicate symbols** - usually dependency issues.

### Error Section 3: Module/Framework Errors
```
📦 === MODULE/FRAMEWORK ERRORS ===
```
**Missing modules, framework not found** - CocoaPods or dependency issues.

### Error Section 4: Error Context
```
📝 === ERROR CONTEXT ===
```
**10 lines before/after each error** - shows what was happening when it failed.

## 🎯 Most Common iOS Build Errors and Fixes

### Error Pattern: "Module 'X' not found"

**Example:**
```
error: module 'FirebaseCore' not found
```

**What it means:** A dependency is missing or not properly installed

**Fix:**
1. Check the "Install CocoaPods dependencies" step in logs
2. Look for pod install errors
3. May need to update Podfile or run `pod repo update`

---

### Error Pattern: "Undefined symbol" or "ld: symbol(s) not found"

**Example:**
```
Undefined symbol: _OBJC_CLASS_$_SomeClass
ld: symbol(s) not found for architecture arm64
```

**What it means:** Missing framework or library linkage

**Fix:**
1. Check if all pods installed successfully
2. May need to add framework to "Link Binary With Libraries"
3. Check for missing import statements

---

### Error Pattern: "No such module"

**Example:**
```
error: no such module 'ReactNative'
```

**What it means:** Import statement can't find the module

**Fix:**
1. Clean build: `rm -rf ios/build ios/Pods`
2. Reinstall: `cd ios && pod install`
3. Check if module is in Podfile

---

### Error Pattern: "PrecompileModule failed"

**Example:**
```
PrecompileModule /path/to/module.pcm failed with exit code 1
```

**What it means:** Xcode 16.1 module precompilation issue

**Fix:**
✅ **Already handled** by the Podfile modifications plugin
- If still occurs, check Step 4 output (CocoaPods install)
- Verify the post_install hook is present in Podfile

---

### Error Pattern: "Provisioning profile" errors

**Example:**
```
error: No profiles for 'com.insighture.smbmobile' were found
```

**What it means:** Code signing issue

**Fix:**
1. Check Step 2 output (Fastlane Match)
2. Verify MATCH_PASSWORD secret is set
3. Verify SSH key has access to certificates repo

---

### Error Pattern: "Command CompileSwift failed"

**Example:**
```
Command CompileSwift failed with a nonzero exit code
```

**What it means:** Swift compilation error (actual error is usually above this line)

**Fix:**
Look at the **ERROR CONTEXT** section for the actual Swift error above this message

---

## 📊 Reading the Fastlane Output

Your Fastlane output now has **8 clearly marked steps**:

```
📋 Step 1/8: Setting up App Store Connect API authentication
   ✅ Should see: "App Store Connect API key configured"

📋 Step 2/8: Fetching provisioning profiles and certificates
   ✅ Should see: "Provisioning profiles and certificates synced successfully"

📋 Step 3/8: Updating code signing settings
   ✅ Should see: "Code signing settings updated"

📋 Step 4/8: Incrementing version number
   ✅ Should see: "Version incremented: X.X.X → X.X.X"

📋 Step 5/8: Incrementing build number
   ✅ Should see: "Build number set to: XX"

📋 Step 6/8: Building iOS app
   ⚙️  This is where most errors occur
   ✅ Should see: "Build completed successfully!"
   ✅ Should see: "IPA created: ./ios/build/smbmobile.ipa (XX.XX MB)"

📋 Step 7/8: Uploading to TestFlight
   ✅ Should see: "Successfully uploaded to TestFlight!"

📋 Step 8/8: Generating changelog
   ✅ Should see: "iOS QA Release Completed Successfully!"
```

**If the build fails, it will show which step failed and why.**

## 🎯 The Smoking Gun

When your build fails, the actual error is usually one of these:

1. **A specific file that can't compile:**
   ```
   /path/to/file.m:123:45: error: [actual error message]
   ```

2. **A missing dependency:**
   ```
   error: module 'SomePod' not found
   ```

3. **A code signing issue:**
   ```
   error: No matching provisioning profiles found
   ```

4. **A build configuration issue:**
   ```
   error: Build input file cannot be found: '/path/to/file'
   ```

## 📥 If You Still Can't Find It

Download the artifacts and search for:

```bash
# Download ios-full-build-output.zip and extract
grep -n "error:" build_output.log | head -n 20
```

This will show the first 20 errors with line numbers.

## 🆘 Emergency Debugging Commands

If you have local access to the project:

```bash
# Clean everything
rm -rf ios/build ios/Pods ios/Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Rebuild
npm run prebuild -- --platform ios --clean
cd ios && pod install --repo-update && cd ..

# Try building
cd ios
xcodebuild -workspace smbmobile.xcworkspace \
  -scheme smbmobile \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  clean build 2>&1 | tee build.log

# Search for errors
grep "error:" build.log
```

## ✅ Success Checklist

When your build succeeds, you should see:

- ✅ All 8 steps complete
- ✅ "IPA created" message with file size
- ✅ "Successfully uploaded to TestFlight!"
- ✅ "iOS QA Release Completed Successfully!"

## 🚨 Common Gotchas

1. **"2 failures" but no error shown**
   - This is what we fixed! The new logging will show the actual errors

2. **Build works locally but fails in CI**
   - Check Xcode version (CI uses 16.1)
   - Check environment variables
   - Check secrets are set correctly

3. **Intermittent failures**
   - Usually provisioning profile or keychain issues
   - Check Step 2 (match) logs
   - Check keychain unlock logs

---

## 🎯 Bottom Line

**After running with the new logging, you will see:**
- Exactly which step failed (1-8)
- The actual error message
- The file and line number
- 10 lines of context around the error
- All relevant build configuration

**No more mysterious "(2 failures)" messages!** 🎉


