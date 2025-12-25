/*
 * settings.gradle.kts
 * Root-level settings for Gradle
 */

// React Native + Expo autolinking
pluginManagement {
    val reactNativeGradlePlugin = File(
        providers.exec {
            workingDir(rootDir)
            commandLine(
                "node", "--print",
                "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })"
            )
        }.standardOutput.asText.get().trim()
    ).parentFile.absolutePath
    includeBuild(reactNativeGradlePlugin)

    val expoPluginsPath = File(
        providers.exec {
            workingDir(rootDir)
            commandLine(
                "node", "--print",
                "require.resolve('expo-modules-autolinking/package.json', { paths: [require.resolve('expo/package.json')] })"
            )
        }.standardOutput.asText.get().trim(),
        "../android/expo-gradle-plugin"
    ).absolutePath
    includeBuild(expoPluginsPath)
}

plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.8.0"
    id("com.facebook.react.settings")
    id("expo-autolinking-settings")
}

rootProject.name = "flo-orders"
include("app")

// Dependency resolution management
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS) // allow subprojects to use these repos
    repositories {
        google()
        mavenCentral()
        maven("https://jitpack.io") // JitPack repository for various packages
    }
}

extensions.getByType<com.facebook.react.ReactSettingsExtension>().apply {
    if (System.getenv("EXPO_USE_COMMUNITY_AUTOLINKING") == "1") {
        autolinkLibrariesFromCommand()
    } else {
        autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
    }
}
expoAutolinking.useExpoModules()
expoAutolinking.useExpoVersionCatalog()
includeBuild(expoAutolinking.reactNativeGradlePlugin)
