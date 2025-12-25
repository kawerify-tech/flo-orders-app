# PDFBox-Android Build Fix

## Issue
EAS build fails with:
```
Could not find com.tom_roush:pdfbox-android:1.8.9.1
```

The version `1.8.9.1` requested by `react-native-pdf-lib` does not exist in Maven repositories.

## Solution Applied

### 1. Dependency Resolution Strategy
Added to `android/app/build.gradle`:
- Forces `pdfbox-android` to use version `1.8.10.1` (available on Maven Central)
- Overrides the non-existent version requested by `react-native-pdf-lib`

### 2. Explicit Dependency
Added `pdfbox-android:1.8.10.1` directly to dependencies to ensure it's available.

## Files Modified
- `android/app/build.gradle` - Added resolution strategy and explicit dependency
- `android/build.gradle` - Ensured Maven Central repository is included

## Testing
After this fix, the build should:
1. Resolve `pdfbox-android:1.8.10.1` from Maven Central
2. Use it instead of the non-existent `1.8.9.1`
3. Build successfully

## Alternative Solution
If version `1.8.10.1` doesn't work, consider:
1. Replacing `react-native-pdf-lib` with `expo-print` (already in project)
2. Using a different PDF generation library
3. Finding the correct pdfbox-android version that exists

## Next Steps
1. Commit the changes
2. Run EAS build again
3. If it still fails, check build logs for the exact version needed

