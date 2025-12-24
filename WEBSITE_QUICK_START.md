# 🚀 Website Distribution - Quick Start

## ⚡ Build All Platforms for Your Website

```bash
# Build everything for website distribution
npm run build-all-for-website
```

## 📁 What You Get

### 1. **Mobile App Files**
- **Android APK** - Download from [EAS Dashboard](https://expo.dev)
- **iOS IPA** - Download from [EAS Dashboard](https://expo.dev)

### 2. **Web App**
- **Web files** - Available in `./dist/` folder
- **PWA ready** - Can be installed on any device

### 3. **Download Page**
- **`website-download-page.html`** - Professional download page
- **Ready to upload** - Just update the download links

## 🌐 Upload to Your Website

### 1. Upload Files
```
your-website/
├── download.html              # Rename website-download-page.html
├── files/
│   ├── flo-orders-v1.0.0.apk # Android app
│   ├── flo-orders-v1.0.0.ipa # iOS app
│   └── web/                   # Web app folder
```

### 2. Update Download Links
Edit the HTML file and update these lines:
```javascript
document.getElementById('android-download').href = '/files/flo-orders-v1.0.0.apk';
document.getElementById('ios-download').href = '/files/flo-orders-v1.0.0.ipa';
document.getElementById('web-app').href = '/files/web/';
```

## 📱 User Installation

### Android Users
1. Download APK from your website
2. Enable "Unknown Sources" in settings
3. Install APK file
4. Open app

### iPhone Users
1. Download IPA from your website
2. Install AltStore (altstore.io)
3. Sideload IPA using AltStore
4. Trust developer certificate

### All Users (Web App)
1. Visit your website
2. Click "Open Web App"
3. Add to home screen (optional)
4. Use like native app

## 🎯 Benefits of Website Distribution

- ✅ **Full Control** - No app store restrictions
- ✅ **Instant Updates** - Update anytime
- ✅ **No Fees** - No app store fees
- ✅ **Direct Access** - Users get app directly from you
- ✅ **Analytics** - Track downloads and usage
- ✅ **Branding** - Complete control over presentation

## 📊 Track Success

- Monitor download counts
- Collect user feedback
- A/B test download pages
- Analyze user behavior

## 🆘 Need Help?

- 📖 **Full Guide**: `WEBSITE_DISTRIBUTION_GUIDE.md`
- 🔧 **Build Issues**: Check EAS Build dashboard
- 💬 **User Support**: Create FAQ section on your website

Your FLO Orders app is ready for professional website distribution! 🎉
