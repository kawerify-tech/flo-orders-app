# PDFBox-Android Dependency Fix

## Issue
The build fails because `react-native-pdf-lib` requires `com.tom_roush:pdfbox-android:1.8.9.1` which is not available in standard Maven repositories.

## Solution
Added dependency resolution strategy to force a compatible version that exists in Maven Central.

## Changes Made

### android/app/build.gradle
- Added `resolutionStrategy` to force `pdfbox-android:1.8.10.1` (available version)
- This overrides the version requested by `react-native-pdf-lib`

## Alternative Solutions

If version `1.8.10.1` doesn't work, try:
1. Remove `react-native-pdf-lib` and use an alternative PDF library
2. Use a different version of pdfbox-android that exists
3. Fork and update `react-native-pdf-lib` to use a newer version

## Testing
After this fix, the build should be able to resolve the pdfbox-android dependency.

