# Dependency Version Fix

## Issue
`npm install` was failing with:
```
npm error notarget No matching version found for expo-device@~7.0.7
```

## Fix Applied
Updated `expo-device` version from `~7.0.7` (doesn't exist) to `~6.0.2` (compatible with Expo SDK 54)

## Changes Made
- **File**: `package.json`
- **Change**: `"expo-device": "~7.0.7"` → `"expo-device": "~6.0.2"`

## Next Steps
1. Run `npm install` - it should now work
2. After installation, you can verify versions with:
   ```bash
   npx expo install --check
   ```
3. If expo suggests different versions, run:
   ```bash
   npx expo install --fix
   ```

## Note
Version `~6.0.2` is compatible with Expo SDK 54. If you need to update to a newer version later, use:
```bash
npx expo install expo-device
```
This will automatically install the correct version for your SDK.

