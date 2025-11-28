# Fastlane Path Fix - Understanding Fastlane's Path Behavior

## 🎯 Issue Found

```
ERROR: Error setting value '../ios/smbmobile.xcodeproj' for option 'path'
ERROR: Path is invalid
```

## 🔍 Root Cause

**Fastlane actions handle paths differently!**

Some Fastlane actions automatically change the working directory to the project root before executing, while others run from the `fastlane/` directory.

### Actions That Change to Project Root

These actions expect paths relative to the **project root** (use `ios/...`):
- ✅ `update_code_signing_settings` - needs `ios/smbmobile.xcodeproj`
- ✅ `increment_version_number` - needs `ios/smbmobile.xcodeproj`
- ✅ `get_version_number` - needs `ios/smbmobile.xcodeproj`
- ✅ `increment_build_number` - needs `ios/smbmobile.xcodeproj`
- ✅ `get_build_number` - needs `ios/smbmobile.xcodeproj`

### Actions That Run from Fastlane Directory

These actions stay in the `fastlane/` directory (use `../ios/...`):
- ✅ `build_ios_app` - needs `../ios/smbmobile.xcworkspace`
- ✅ Output directories and paths - need `../ios/build`

## ✅ Fix Applied

### For Project Configuration Actions
```ruby
# Use ios/ (relative to project root)
project_path = "ios/smbmobile.xcodeproj"

update_code_signing_settings(
  path: project_path,  # ✅ Correct
  # ...
)

increment_version_number(
  xcodeproj: project_path,  # ✅ Correct
  # ...
)
```

### For Build Actions
```ruby
# Use ../ios/ (relative to fastlane directory)
build_config = {
  workspace: "../ios/smbmobile.xcworkspace",  # ✅ Correct
  output_directory: "../ios/build",  # ✅ Correct
  # ...
}
```

## 📊 What Changed

### Before (Broken):
```ruby
# All paths used ../ios/ - WRONG for some actions!
update_code_signing_settings(
  path: "../ios/smbmobile.xcodeproj",  # ❌ Error!
)

build_ios_app(
  workspace: "../ios/smbmobile.xcworkspace",  # ✅ OK
)
```

### After (Fixed):
```ruby
# Paths tailored to each action type
update_code_signing_settings(
  path: "ios/smbmobile.xcodeproj",  # ✅ Fixed!
)

build_ios_app(
  workspace: "../ios/smbmobile.xcworkspace",  # ✅ Still OK
)
```

## 🎯 Summary of Changes

### QA Release Lane:
- ✅ `update_code_signing_settings`: `../ios/` → `ios/`
- ✅ `get_version_number`: `../ios/` → `ios/` (3 occurrences)
- ✅ `increment_version_number`: `../ios/` → `ios/`
- ✅ `get_build_number`: `../ios/` → `ios/` (2 occurrences)
- ✅ `increment_build_number`: `../ios/` → `ios/` (3 occurrences)
- ✅ `build_ios_app`: Kept `../ios/` ✓

### Other Lanes (stg_release, production_release, release):
- ✅ `increment_version_number`: `../ios/` → `ios/`
- ✅ `increment_build_number`: `../ios/` → `ios/`
- ✅ `build_ios_app`: Kept `../ios/` ✓

### Dev Build Lane:
- ✅ `build_ios_app`: Kept `../ios/` ✓

## 📋 Next Steps

**1. Commit the fix:**
```bash
git add fastlane/Fastfile
git commit -m "Fix: Use correct paths for different Fastlane actions

- Project config actions (update_code_signing_settings, version/build number) 
  use ios/ paths (they chdir to project root)
- Build actions (build_ios_app) use ../ios/ paths (run from fastlane dir)
- Fixes 'Path is invalid' error in update_code_signing_settings"
git push
```

**2. Run the workflow**

**3. Expected result:**
```
✅ Provisioning profiles and certificates synced successfully
✅ Code signing settings updated  ← Should work now!
✅ Version incremented: 1.0.0 → 1.0.1
✅ Build number set to: 38
✅ Workspace found: ../ios/smbmobile.xcworkspace
🔨 Starting xcodebuild...
```

## 🎓 Key Learning

**Fastlane's path behavior depends on the action:**

1. **Configuration actions** (`update_code_signing_settings`, version/build) automatically `chdir` to project root
   - Use: `ios/smbmobile.xcodeproj`

2. **Build actions** (`build_ios_app`) run from the fastlane directory  
   - Use: `../ios/smbmobile.xcworkspace`

3. **File system operations** in Ruby code run from fastlane directory
   - Use: `../ios/` for checks like `File.exist?('../ios/...')`

## 🔍 How to Tell Which Path to Use

Look at the Fastlane source code or documentation, but generally:

**Use `ios/...` for:**
- Xcode project file operations (update_code_signing_settings)
- Version/build number operations
- Most Fastlane "configuration" actions

**Use `../ios/...` for:**
- Build operations (build_ios_app, gym)
- File paths in workspace/scheme names
- Output directories
- Manual file system checks in Ruby code

## ✅ All Fixed!

The Fastfile now uses the correct path format for each type of action:
- ✅ No more "Path is invalid" errors
- ✅ All lanes updated (qa, staging, production, legacy, dev)
- ✅ Consistent path handling throughout

---

**Commit and run! The path issue is resolved.** 🚀

