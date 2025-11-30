#!/bin/bash

# iOS Build Setup Verification Script
# This script verifies that all required files and dependencies are in place
# for iOS builds before running Fastlane

set -e

echo "========================================="
echo "🔍 iOS Build Setup Verification"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track errors
ERRORS=0
WARNINGS=0

# Check function
check_exists() {
    local path=$1
    local name=$2
    local type=$3  # "file" or "directory"
    
    if [ "$type" = "file" ]; then
        if [ -f "$path" ]; then
            echo -e "${GREEN}✅${NC} $name found: $path"
            return 0
        else
            echo -e "${RED}❌${NC} $name NOT found: $path"
            ERRORS=$((ERRORS + 1))
            return 1
        fi
    else
        if [ -d "$path" ]; then
            echo -e "${GREEN}✅${NC} $name found: $path"
            return 0
        else
            echo -e "${RED}❌${NC} $name NOT found: $path"
            ERRORS=$((ERRORS + 1))
            return 1
        fi
    fi
}

# Check optional file/directory
check_optional() {
    local path=$1
    local name=$2
    local type=$3  # "file" or "directory"
    
    if [ "$type" = "file" ]; then
        if [ -f "$path" ]; then
            echo -e "${GREEN}✅${NC} $name found: $path"
            return 0
        else
            echo -e "${YELLOW}⚠️${NC}  $name NOT found: $path (optional)"
            WARNINGS=$((WARNINGS + 1))
            return 1
        fi
    else
        if [ -d "$path" ]; then
            echo -e "${GREEN}✅${NC} $name found: $path"
            return 0
        else
            echo -e "${YELLOW}⚠️${NC}  $name NOT found: $path (optional)"
            WARNINGS=$((WARNINGS + 1))
            return 1
        fi
    fi
}

echo "📋 Checking Project Structure..."
echo ""

# Check iOS directory
check_exists "ios" "iOS directory" "directory"

if [ -d "ios" ]; then
    # Check Xcode workspace
    check_exists "ios/smbmobile.xcworkspace" "Xcode Workspace" "directory"
    
    # Check Xcode project
    check_exists "ios/smbmobile.xcodeproj" "Xcode Project" "directory"
    
    # Check Podfile
    check_exists "ios/Podfile" "Podfile" "file"
    
    # Check Podfile.lock
    check_optional "ios/Podfile.lock" "Podfile.lock" "file"
    
    # Check Pods directory
    check_exists "ios/Pods" "Pods directory" "directory"
    
    # Check for key pods
    if [ -d "ios/Pods" ]; then
        echo ""
        echo "📦 Checking Key CocoaPods..."
        check_optional "ios/Pods/RNFBMessaging" "Firebase Messaging Pod" "directory"
        check_optional "ios/Pods/RNFBApp" "Firebase App Pod" "directory"
    fi
    
    # Check for GoogleService-Info.plist in project root
    echo ""
    echo "🔥 Checking Firebase Configuration..."
    check_optional "GoogleService-Info.plist" "GoogleService-Info.plist (root)" "file"
    check_optional "ios/GoogleService-Info.plist" "GoogleService-Info.plist (ios)" "file"
fi

echo ""
echo "🔧 Checking Build Tools..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅${NC} Node.js: $NODE_VERSION"
else
    echo -e "${RED}❌${NC} Node.js not found"
    ERRORS=$((ERRORS + 1))
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅${NC} npm: $NPM_VERSION"
else
    echo -e "${RED}❌${NC} npm not found"
    ERRORS=$((ERRORS + 1))
fi

# Check Xcode (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v xcodebuild &> /dev/null; then
        XCODE_VERSION=$(xcodebuild -version | head -n 1)
        echo -e "${GREEN}✅${NC} Xcode: $XCODE_VERSION"
        
        # Check Xcode path
        XCODE_PATH=$(xcode-select -p)
        echo "   Path: $XCODE_PATH"
    else
        echo -e "${RED}❌${NC} Xcode not found"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check CocoaPods
    if command -v pod &> /dev/null; then
        POD_VERSION=$(pod --version)
        echo -e "${GREEN}✅${NC} CocoaPods: $POD_VERSION"
    else
        echo -e "${RED}❌${NC} CocoaPods not found"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️${NC}  Not running on macOS - skipping Xcode/CocoaPods check"
fi

# Check Fastlane
if command -v fastlane &> /dev/null; then
    FASTLANE_VERSION=$(fastlane --version | grep "fastlane [0-9]" | cut -d ' ' -f 2)
    echo -e "${GREEN}✅${NC} Fastlane: $FASTLANE_VERSION"
else
    echo -e "${YELLOW}⚠️${NC}  Fastlane not found (optional for local development)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "🔐 Checking Environment Variables..."
echo ""

# Check for .env file
if [ -f ".env" ]; then
    echo -e "${GREEN}✅${NC} .env file found"
    
    # Check for required env vars
    if grep -q "KINDE_DOMAIN" .env; then
        echo -e "${GREEN}✅${NC} KINDE_DOMAIN configured"
    else
        echo -e "${YELLOW}⚠️${NC}  KINDE_DOMAIN not found in .env"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q "KINDE_CLIENT_ID" .env; then
        echo -e "${GREEN}✅${NC} KINDE_CLIENT_ID configured"
    else
        echo -e "${YELLOW}⚠️${NC}  KINDE_CLIENT_ID not found in .env"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️${NC}  .env file not found (required for local development)"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "========================================="
echo "📊 Verification Summary"
echo "========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo "You're ready to build the iOS app."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    echo "You can proceed, but some optional features may not work."
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo ""
    echo "💡 Next Steps:"
    if [ ! -d "ios" ] || [ ! -d "ios/smbmobile.xcworkspace" ]; then
        echo "  1. Run: npm run prebuild -- --platform ios"
        echo "  2. Run: cd ios && pod install && cd .."
    fi
    if [ ! -f ".env" ]; then
        echo "  3. Create .env file with required variables"
    fi
    echo "  4. Re-run this script to verify"
    echo ""
    exit 1
fi

