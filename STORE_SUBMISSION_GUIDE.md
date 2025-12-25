# 📱 Store Submission Guide

## ✅ Pre-Submission Checklist

### Code Configuration - **COMPLETE** ✅
- [x] Privacy Policy URL configured
- [x] iOS permission descriptions added
- [x] Android permissions optimized for Android 10+
- [x] EAS build configuration verified
- [x] All required metadata in app.config.js

---

## 🎯 Google Play Store Submission

### Step 1: Complete Google Play Console Setup

1. **Go to Google Play Console**: https://play.google.com/console
2. **Create/Select App**: Create new app or select existing
3. **App Details**:
   - App name: "Flo Orders"
   - Default language: English
   - App or game: App
   - Free or paid: Free

### Step 2: Complete Required Forms

#### A. Content Rating (REQUIRED)
1. Navigate to: **Policy → Content rating**
2. Complete IARC questionnaire
3. Answer questions about:
   - Violence
   - Sexual content
   - Profanity
   - Controlled substances
   - Gambling
   - etc.
4. **Expected Rating**: Everyone or Teen (depending on content)

#### B. Data Safety Form (REQUIRED)
1. Navigate to: **Policy → Data safety**
2. Complete the form with:
   - **Privacy Policy URL**: `https://kawerifytech.com/privacy-policy`
   - **Data Collection**: 
     - Personal info (email, name) - Yes
     - Financial info (transactions) - Yes
     - Location - No (unless you use it)
     - Photos/Media - No
     - Files/Documents - Yes (PDF generation)
   - **Data Sharing**: With Firebase/Google services
   - **Data Security**: Encrypted in transit
   - **User Rights**: Deletion, access, correction

#### C. Store Listing (REQUIRED)
1. **App Name**: Flo Orders
2. **Short Description**: (80 characters max)
   - Example: "Manage fuel orders and transactions efficiently"
3. **Full Description**: (4000 characters max)
   - Describe features, benefits, use cases
4. **App Icon**: Upload 512x512 PNG
5. **Feature Graphic**: Upload 1024x500 PNG
6. **Screenshots**: 
   - Phone: At least 2 (up to 8)
   - Tablet: At least 2 (up to 8)
   - Recommended sizes: 1080x1920 or 1440x2560

#### D. App Access (REQUIRED)
1. **Is your app free?**: Yes
2. **Content guidelines**: Accept
3. **US export laws**: Accept

### Step 3: Upload Your App

1. **Build your app**:
   ```bash
   eas build -p android --profile production
   ```

2. **Download the AAB file** from EAS dashboard

3. **Upload to Play Console**:
   - Go to: **Release → Production → Create new release**
   - Upload the AAB file
   - Add release notes
   - Review and roll out

### Step 4: Submit for Review

1. Complete all required sections (marked with ⚠️)
2. Click **"Submit for review"**
3. Wait for review (typically 1-3 days)

---

## 🍎 Apple App Store Submission

### Step 1: Complete App Store Connect Setup

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **Create New App**:
   - Platform: iOS
   - Name: Flo Orders
   - Primary Language: English
   - Bundle ID: com.floorders
   - SKU: flo-orders-001

### Step 2: Complete App Information

#### A. App Information
- **Privacy Policy URL**: `https://kawerifytech.com/privacy-policy` ✅
- **Category**: Business or Utilities
- **Subcategory**: (optional)

#### B. Pricing and Availability
- **Price**: Free
- **Availability**: Select countries

#### C. Age Rating (REQUIRED)
1. Complete the questionnaire:
   - Violence: None
   - Sexual content: None
   - Profanity: None
   - Horror/Fear: None
   - Alcohol/Tobacco: None
   - Gambling: None
   - Contests: None
   - Unrestricted web access: No
   - **Expected Rating**: 4+ (Everyone)

### Step 3: Prepare App Store Listing

#### A. App Preview and Screenshots (REQUIRED)
- **iPhone 6.7" Display**: 1290x2796 (at least 3)
- **iPhone 6.5" Display**: 1284x2778 (at least 3)
- **iPhone 5.5" Display**: 1242x2208 (at least 3)
- **iPad Pro 12.9"**: 2048x2732 (at least 3)
- **iPad Pro 11"**: 1668x2388 (at least 3)

#### B. Description
- **Name**: Flo Orders (30 characters max)
- **Subtitle**: (30 characters max)
- **Description**: (4000 characters max)
- **Keywords**: (100 characters max, comma-separated)
  - Example: "fuel,orders,transactions,business,management"

#### C. Support URL
- **Support URL**: `https://kawerifytech.com/support`
- **Marketing URL**: (optional) `https://kawerifytech.com`

### Step 4: Build and Upload Your App

1. **Build your app**:
   ```bash
   eas build -p ios --profile production
   ```

2. **Download the IPA** from EAS dashboard

3. **Upload via Transporter** or EAS Submit:
   ```bash
   eas submit -p ios --profile production
   ```

### Step 5: Submit for Review

1. **Create New Version** in App Store Connect
2. **Select Build**: Choose the uploaded build
3. **Complete Export Compliance**: Already declared (usesNonExemptEncryption: false)
4. **Add Version Information**:
   - What's New: Version 1.0.0 release notes
5. **Submit for Review**

---

## 📋 Required Information Summary

### Privacy Policy URL
- **Android**: ✅ Configured in app.config.js
- **iOS**: ✅ Configured in app.config.js
- **URL**: `https://kawerifytech.com/privacy-policy`
- **Action Required**: Ensure this URL is publicly accessible and contains your privacy policy

### Permissions Justification

#### Android Permissions:
- **INTERNET**: Required for Firebase and API calls
- **READ_EXTERNAL_STORAGE**: Required for PDF generation (reading templates)
- **WRITE_EXTERNAL_STORAGE**: Required for saving PDF files
- **SYSTEM_ALERT_WINDOW**: Required for overlay notifications
- **VIBRATE**: Required for notification feedback

#### iOS Permissions:
- **Notifications**: Required for push notifications about orders and transactions

### App Store Metadata Templates

#### Google Play Store Description:
```
Flo Orders - Fuel Order Management System

Manage your fuel orders and transactions efficiently with Flo Orders. 
Perfect for fuel stations, attendants, and clients to track orders, 
process payments, and generate reports.

Features:
• Easy order management
• Real-time transaction tracking
• PDF report generation
• Secure authentication
• Multi-user support (Admin, Attendant, Client roles)

Download now and streamline your fuel order management!
```

#### App Store Description:
```
Flo Orders - Fuel Order Management

Streamline your fuel order management with Flo Orders. Designed for 
fuel stations, this app helps you manage orders, track transactions, 
and generate reports effortlessly.

Key Features:
• Order Management - Create and track fuel orders
• Transaction Processing - Handle payments securely
• PDF Reports - Generate detailed transaction reports
• Multi-Role Support - Admin, Attendant, and Client roles
• Real-time Updates - Stay synchronized across devices

Perfect for fuel station owners, attendants, and clients who need 
an efficient way to manage fuel orders and transactions.
```

---

## ⚠️ Important Notes

1. **Privacy Policy**: You MUST have a publicly accessible privacy policy at `https://kawerifytech.com/privacy-policy` before submission.

2. **Screenshots**: Take high-quality screenshots showing key features of your app.

3. **Testing**: Test your app thoroughly on multiple devices before submission.

4. **Review Time**: 
   - Google Play: 1-3 days typically
   - App Store: 1-7 days typically

5. **Rejections**: If rejected, address the feedback and resubmit.

---

## 🎉 After Approval

1. **Monitor Reviews**: Respond to user reviews
2. **Track Analytics**: Use store analytics to understand usage
3. **Update Regularly**: Keep your app updated with new features
4. **Maintain Compliance**: Keep privacy policy and store listings updated

---

## 📞 Support

For issues with:
- **EAS Build**: Check EAS documentation or support
- **Google Play**: Google Play Console help
- **App Store**: App Store Connect help
- **App Issues**: Contact kawerifytech@gmail.com

