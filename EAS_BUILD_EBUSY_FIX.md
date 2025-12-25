# EAS Build EBUSY Error Fix

## Issue
EAS Build fails with:
```
EBUSY: resource busy or locked, copyfile '.gradle\8.9\checksums\checksums.lock'
```

This happens because:
1. Gradle daemon processes are holding lock files
2. `.gradle` directory is being included in the build archive
3. Windows file locking prevents copying locked files

## Solution Applied

### 1. Updated `.easignore`
Added comprehensive exclusions for:
- `.gradle/` directories (Gradle cache and lock files)
- `build/` directories (build outputs)
- Build artifacts (`.apk`, `.aab`, `.ipa`)
- IDE files (`.idea/`, `.vscode/`)
- OS files (`.DS_Store`, `Thumbs.db`)
- Temporary files (`*.tmp`, `*.log`, `*.lock`)

### 2. Stop Gradle Daemons
Before running EAS build, stop any running Gradle daemons:
```bash
cd android
./gradlew --stop
cd ..
```

Or on Windows:
```powershell
cd android
.\gradlew.bat --stop
cd ..
```

## Files Modified
- `.easignore` - Added comprehensive exclusions for build artifacts

## Prevention

### Before Running EAS Build:
1. **Stop Gradle daemons**:
   ```bash
   cd android && ./gradlew --stop && cd ..
   ```

2. **Close IDE/editors** that might have files open

3. **Wait a few seconds** after stopping daemons before running build

### Alternative: Use EAS Build with Clean
EAS Build will regenerate native folders anyway, so excluding `.gradle` is safe.

## Next Steps

1. **Stop Gradle daemons** (if not already done):
   ```powershell
   cd android
   .\gradlew.bat --stop
   cd ..
   ```

2. **Commit the changes**:
   ```bash
   git add .easignore
   git commit -m "Fix: Exclude Gradle artifacts from EAS builds"
   git push
   ```

3. **Run EAS build again**:
   ```bash
   eas build -p android --profile internal
   ```

## Why This Works

- `.easignore` tells EAS Build to exclude these files/directories
- Gradle daemons won't interfere if stopped
- Build artifacts aren't needed (EAS regenerates everything)
- Lock files won't cause conflicts if excluded

The build should now succeed without EBUSY errors.

