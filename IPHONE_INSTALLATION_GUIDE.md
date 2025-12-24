# iPhone Installation Guide - FLO Orders

## 📱 Methods to Install Your App on iPhones

There are several ways to get your FLO Orders app installed on iPhones. Here's a complete guide for each method:

---

## 🚀 Method 1: TestFlight (Recommended for Testing)

TestFlight is Apple's official beta testing platform. Perfect for testing with real users before App Store release.

### Prerequisites
1. **Apple Developer Account** ($99/year)
2. **App Store Connect** access
3. **EAS CLI** installed

### Steps:

#### 1. Set Up Apple Developer Account
```bash
# Install EAS CLI if not already installed
npm install -g @expo/eas-cli

# Login to your Expo account
eas login
```

#### 2. Configure Your Apple Developer Details
Update the `eas.json` file with your Apple Developer information:
```json
{
  "submit": {
    "testflight": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      }
    }
  }
}
```

#### 3. Build for TestFlight
```bash
# Build for TestFlight
eas build --platform ios --profile testflight

# Submit to TestFlight
eas submit --platform ios --profile testflight
```

#### 4. Invite Testers
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app → TestFlight
3. Add internal/external testers
4. Send invitations

### ✅ Advantages:
- Official Apple testing platform
- Easy distribution to multiple testers
- Automatic updates
- Crash reporting and analytics

---

## 🔧 Method 2: Development Build (For Developers)

Perfect for development and testing on your own devices.

### Prerequisites
1. **Apple Developer Account**
2. **iOS device registered** in Apple Developer Portal
3. **Xcode** installed (on macOS)

### Steps:

#### 1. Register Your Device
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to Certificates, Identifiers & Profiles → Devices
3. Register your iPhone's UDID

#### 2. Build Development Version
```bash
# Build development version
eas build --platform ios --profile development

# Install on device via EAS CLI
eas device:create
```

#### 3. Install via Cable or AirDrop
- Download the `.ipa` file from EAS dashboard
- Install using Xcode or third-party tools like 3uTools

### ✅ Advantages:
- Full development features
- Direct installation
- No App Store review process

---

## 🏪 Method 3: App Store (Production Release)

The official way for public distribution.

### Prerequisites
1. **Apple Developer Account**
2. **App Store Connect** app created
3. **App Store Review** approval

### Steps:

#### 1. Prepare for App Store
```bash
# Build production version
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

#### 2. App Store Connect Setup
1. Create app in App Store Connect
2. Fill in app information, screenshots, description
3. Set pricing and availability
4. Submit for review

#### 3. App Store Review
- Apple reviews your app (1-7 days typically)
- Address any feedback if rejected
- Once approved, app goes live

### ✅ Advantages:
- Official distribution
- Automatic updates
- Maximum reach
- App Store discovery

---

## 📋 Pre-Installation Checklist

Before building for any method, ensure:

### ✅ Apple Developer Account Setup
- [ ] Apple Developer Program membership ($99/year)
- [ ] Team ID obtained
- [ ] Bundle identifier registered

### ✅ App Configuration
- [ ] Unique bundle identifier (`com.floorders`)
- [ ] App icons in all required sizes
- [ ] Launch screen configured
- [ ] Privacy policy URL (if collecting data)

### ✅ Code Signing
- [ ] Development certificates created
- [ ] Distribution certificates created
- [ ] Provisioning profiles configured

---

## 🛠️ Quick Setup Commands

### Install Required Tools
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Install Expo CLI (if needed)
npm install -g @expo/cli

# Login to Expo
eas login
```

### Build Commands
```bash
# Development build (for testing on registered devices)
eas build --platform ios --profile development

# Preview build (for internal testing)
eas build --platform ios --profile preview

# TestFlight build
eas build --platform ios --profile testflight

# Production build (for App Store)
eas build --platform ios --profile production
```

### Submit Commands
```bash
# Submit to TestFlight
eas submit --platform ios --profile testflight

# Submit to App Store
eas submit --platform ios --profile production
```

---

## 📱 Installation Methods for End Users

### TestFlight Installation (Beta Testers)
1. Install **TestFlight** app from App Store
2. Open invitation link or enter invitation code
3. Tap **Install** in TestFlight app

### App Store Installation (Public Release)
1. Search "FLO Orders" in App Store
2. Tap **Get** to download and install
3. App appears on home screen

### Development Installation (Developers Only)
1. Download `.ipa` file from EAS dashboard
2. Use Xcode, 3uTools, or similar tool to install
3. Trust developer certificate in Settings → General → VPN & Device Management

---

## 🔍 Troubleshooting

### Common Issues:

#### "Untrusted Developer" Error
**Solution:** Go to Settings → General → VPN & Device Management → Trust the developer certificate

#### Build Failures
**Solution:** Check:
- Apple Developer account status
- Bundle identifier uniqueness
- Code signing certificates
- Provisioning profiles

#### TestFlight Issues
**Solution:** Verify:
- App Store Connect access
- Correct Apple ID in configuration
- Team ID matches your developer account

---

## 📞 Support Resources

- **Expo Documentation:** [docs.expo.dev](https://docs.expo.dev)
- **Apple Developer:** [developer.apple.com](https://developer.apple.com)
- **App Store Connect:** [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- **TestFlight:** [developer.apple.com/testflight](https://developer.apple.com/testflight)

---

## 🎯 Recommended Workflow

1. **Start with Development builds** for initial testing
2. **Use TestFlight** for beta testing with real users
3. **Submit to App Store** when ready for public release
4. **Maintain TestFlight** for ongoing beta testing

Your FLO Orders app is now ready for iPhone installation using any of these methods! 🚀
