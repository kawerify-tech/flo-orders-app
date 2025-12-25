module.exports = {
  expo: {
    name: "Flo Orders",
    slug: "flo-orders",
    version: "1.0.0",
    platforms: ["ios", "android"],
    orientation: "default",
    icon: "./assets/images/flo-logo.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/flo-logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    android: {
      package: "com.floorders.floorders",
      versionCode: 4,
      adaptiveIcon: {
        foregroundImage: "./assets/images/flo-logo.png",
        backgroundColor: "#ffffff"
      },
      googleServicesFile: "./android/app/google-services.json",
      // Privacy Policy URL - REQUIRED for Google Play Store submission
      privacy: "https://kawerifytech.com/privacy-policy"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.floorders",
      buildNumber: "4",
      googleServicesFile: "./app/GoogleService-Info.plist",
      deploymentTarget: "15.1",
      requireFullScreen: false,
      config: {
        usesNonExemptEncryption: false
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"]
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["C617.1"]
          }
        ]
      },
      // Privacy Policy URL - REQUIRED for App Store submission
      privacy: "https://kawerifytech.com/privacy-policy",
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSExceptionDomains: {
            "firebaseapp.com": {
              NSExceptionAllowsInsecureHTTPLoads: false,
              NSExceptionMinimumTLSVersion: "1.2"
            },
            "googleapis.com": {
              NSExceptionAllowsInsecureHTTPLoads: false,
              NSExceptionMinimumTLSVersion: "1.2"
            }
          }
        },
        // Permission usage descriptions - REQUIRED for App Store if permissions are requested
        NSUserNotificationsUsageDescription: "We need notification permissions to send you important updates about your fuel orders and transactions.",
        NSLocationWhenInUseUsageDescription: "We need your location to enhance account security and detect unauthorized access to your account.",
        CFBundleURLTypes: [
          {
            CFBundleURLName: "com.floorders",
            CFBundleURLSchemes: ["com.floorders"]
          }
        ],
        UISupportedInterfaceOrientations: [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown"
        ],
        "UISupportedInterfaceOrientations~ipad": [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown",
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight"
        ],
        UIRequiredDeviceCapabilities: ["armv7"],
        UIStatusBarStyle: "UIStatusBarStyleDefault",
        UIViewControllerBasedStatusBarAppearance: true
      }
    },
    plugins: [
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "15.1",
            newArchEnabled: false,
            flipper: false
          },
          android: {
            newArchEnabled: false,
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24
          }
        }
      ],
      "expo-font",
      "expo-router",
      "expo-web-browser",
      "expo-splash-screen",
      "expo-location"
    ],
    extra: {
      eas: {
        projectId: "de9759a5-a92e-48f8-aca2-ac2959cfd7c8"
      }
    }
  }
};
