# 🚀 Quick Start - iPhone Installation

## Prerequisites
1. **Apple Developer Account** ($99/year) - [Sign up here](https://developer.apple.com)
2. **EAS CLI** installed globally

## ⚡ Quick Setup Commands

```bash
# 1. Install EAS CLI (if not already installed)
npm install -g @expo/eas-cli

# 2. Login to Expo
eas login

# 3. Run iOS setup script
npm run setup-ios
```

## 📱 Build for iPhone Installation

### Option 1: TestFlight (Recommended)
```bash
# Build and submit to TestFlight in one command
npm run build-ios-testflight
npm run submit-testflight
```

### Option 2: Development Build
```bash
# For testing on your registered devices
npm run build-ios-dev
```

### Option 3: App Store Release
```bash
# For public App Store release
npm run build-ios-production
npm run submit-appstore
```

## 🔧 Before Building

1. **Update `eas.json`** with your Apple Developer details:
   ```json
   {
     "submit": {
       "testflight": {
         "ios": {
           "appleId": "your-apple-id@email.com",
           "ascAppId": "your-app-id",
           "appleTeamId": "your-team-id"
         }
       }
     }
   }
   ```

2. **Register your devices** (for development builds):
   - Go to [Apple Developer Portal](https://developer.apple.com)
   - Add device UDIDs under Certificates, Identifiers & Profiles

## 📋 Installation Methods

| Method | Best For | Requirements |
|--------|----------|-------------|
| **TestFlight** | Beta testing | Apple Developer Account |
| **Development** | Personal testing | Registered device UDID |
| **App Store** | Public release | App Store approval |

## 🆘 Need Help?

- 📖 **Full Guide**: Read `IPHONE_INSTALLATION_GUIDE.md`
- 🍎 **Apple Docs**: [developer.apple.com](https://developer.apple.com)
- 📱 **Expo Docs**: [docs.expo.dev](https://docs.expo.dev)

## 🎯 Recommended Flow

1. **Start**: `npm run setup-ios`
2. **Test**: `npm run build-ios-testflight`
3. **Beta**: Invite testers via App Store Connect
4. **Release**: `npm run build-ios-production` → App Store

Your FLO Orders app is ready for iPhone installation! 🎉
