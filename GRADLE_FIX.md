# Gradle Kotlin DSL Fix

## Issue
Gradle Kotlin DSL compilation error in `settings.gradle.kts`:
```
Type mismatch: inferred type is ReactSettingsExtension.(Any?) -> Unit but TypeVariable(T).() -> Unit was expected
Cannot infer a type for this parameter. Please specify it explicitly.
Expected no parameters
```

## Fix Applied
Changed from `extensions.configure<Type> { ex -> }` syntax to `extensions.getByType<Type>().apply { }` syntax, which is the correct Kotlin DSL pattern.

**Before:**
```kotlin
extensions.configure<com.facebook.react.ReactSettingsExtension> { ex ->
    if (System.getenv("EXPO_USE_COMMUNITY_AUTOLINKING") == "1") {
        ex.autolinkLibrariesFromCommand()
    } else {
        ex.autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
    }
}
```

**After:**
```kotlin
extensions.getByType<com.facebook.react.ReactSettingsExtension>().apply {
    if (System.getenv("EXPO_USE_COMMUNITY_AUTOLINKING") == "1") {
        autolinkLibrariesFromCommand()
    } else {
        autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
    }
}
```

## Why This Works
- `getByType<T>()` retrieves the extension by type
- `.apply { }` provides the scope where `this` refers to the extension
- No lambda parameter needed, methods are called directly on `this`

## Status
✅ Fixed - No linter errors
✅ Gradle should now compile successfully

