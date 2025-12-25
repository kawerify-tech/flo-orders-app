# Fix PDFBox-Android Dependency Issue

## Problem
`react-native-pdf-lib` requires `com.tom_roush:pdfbox-android:1.8.9.1` which doesn't exist in any Maven repository.

## Solution: Replace with expo-print

Since `expo-print` is already in your project and working, this is the recommended solution.

### Steps to Fix:

1. **Remove react-native-pdf-lib:**
   ```bash
   npm uninstall react-native-pdf-lib
   ```

2. **Update client-details.tsx to use expo-print:**
   - Replace PDFDocument usage with Print.printToFileAsync
   - Use HTML to generate PDF (like in transactions.tsx)

3. **Remove pdfbox dependency from build.gradle:**
   - Remove the pdfbox-android dependency
   - Remove the resolution strategy

4. **Test the build:**
   ```bash
   eas build -p android --profile internal
   ```

## Alternative: Try Available Version

If you want to keep react-native-pdf-lib, check Maven Central for available versions:
- Visit: https://repo1.maven.org/maven2/com/tom_roush/pdfbox-android/
- Find the latest available version
- Update build.gradle accordingly

## Recommendation
**Use expo-print** - it's maintained, works with Expo SDK 54, and you already have it working in your codebase.

