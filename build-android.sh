#!/bin/bash

# TrueAI LocalAI - Android APK Build Script
# This script automates the process of building an Android APK

set -e

echo "========================================="
echo "TrueAI LocalAI - Android APK Builder"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

# Check Java
if ! command -v java &> /dev/null; then
    echo -e "${RED}Error: Java JDK is not installed${NC}"
    echo -e "${YELLOW}Please install Java JDK 21${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Java found: $(java -version 2>&1 | head -n 1)${NC}"

# Check Android SDK
if [ -z "$ANDROID_HOME" ]; then
    echo -e "${YELLOW}Warning: ANDROID_HOME is not set${NC}"
    echo -e "${YELLOW}Attempting to use default Android SDK location...${NC}"

    # Try common locations
    if [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
    elif [ -d "/usr/local/lib/android/sdk" ]; then
        export ANDROID_HOME="/usr/local/lib/android/sdk"
    else
        echo -e "${RED}Error: Android SDK not found${NC}"
        echo -e "${YELLOW}Please install Android SDK and set ANDROID_HOME${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Android SDK found at: $ANDROID_HOME${NC}"

echo ""
echo "========================================="
echo "Starting build process..."
echo "========================================="
echo ""

# Step 1: Install dependencies
echo "Step 1: Installing dependencies..."
npm install

# Step 2: Build web app
echo ""
echo "Step 2: Building web application..."
npm run build

# Step 3: Check if android directory exists
if [ ! -d "android" ]; then
    echo ""
    echo "Step 3: Android platform not found. Adding Android platform..."
    npx cap add android
else
    echo ""
    echo "Step 3: Android platform exists. Syncing..."
    npx cap sync android
fi

# Step 4: Build APK
echo ""
echo "Step 4: Building Android APK..."
echo ""

# Ask user which build type
echo "Which build would you like to create?"
echo "1) Debug APK (for testing)"
echo "2) Release APK (unsigned, for production)"
read -p "Enter your choice (1 or 2): " choice

cd android

case $choice in
    1)
        echo ""
        echo "Building Debug APK..."
        ./gradlew assemblePlayDebug --no-daemon

        if [ $? -eq 0 ]; then
            APK_PATH="app/build/outputs/apk/play/debug/app-play-debug.apk"
            echo ""
            echo -e "${GREEN}=========================================${NC}"
            echo -e "${GREEN}✓ Build successful!${NC}"
            echo -e "${GREEN}=========================================${NC}"
            echo ""
            echo "Debug APK location:"
            echo -e "${GREEN}$(pwd)/$APK_PATH${NC}"
            echo ""
            echo "You can install it with:"
            echo "adb install $APK_PATH"
        else
            echo -e "${RED}Build failed!${NC}"
            exit 1
        fi
        ;;
    2)
        echo ""
        echo "Building Release APK..."
        ./gradlew assemblePlayRelease --no-daemon

        if [ $? -eq 0 ]; then
            APK_PATH="app/build/outputs/apk/play/release/app-play-release-unsigned.apk"
            echo ""
            echo -e "${GREEN}=========================================${NC}"
            echo -e "${GREEN}✓ Build successful!${NC}"
            echo -e "${GREEN}=========================================${NC}"
            echo ""
            echo "Release APK location:"
            echo -e "${GREEN}$(pwd)/$APK_PATH${NC}"
            echo ""
            echo -e "${YELLOW}Note: This APK is unsigned and needs to be signed for distribution.${NC}"
            echo -e "${YELLOW}See ANDROID_BUILD_GUIDE.md for signing instructions.${NC}"
        else
            echo -e "${RED}Build failed!${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
