#!/usr/bin/env node

/**
 * Build Script for Website Distribution
 * Builds all platforms and prepares files for website upload
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🌐 FLO Orders - Website Distribution Builder');
console.log('==========================================\n');

// Get version from app.config.js
function getAppVersion() {
  try {
    const configPath = path.join(__dirname, 'app.config.js');
    const config = require(configPath);
    return config.expo.version;
  } catch (error) {
    return '1.0.0';
  }
}

// Build Android APK
async function buildAndroid() {
  console.log('📱 Building Android APK...');
  try {
    execSync('npm run build-android-website', { stdio: 'inherit' });
    console.log('✅ Android APK build completed');
    return true;
  } catch (error) {
    console.log('❌ Android build failed:', error.message);
    return false;
  }
}

// Build iOS IPA
async function buildIOS() {
  console.log('🍎 Building iOS IPA...');
  try {
    execSync('npm run build-ios-website', { stdio: 'inherit' });
    console.log('✅ iOS IPA build completed');
    return true;
  } catch (error) {
    console.log('❌ iOS build failed:', error.message);
    return false;
  }
}

// Build Web App
async function buildWeb() {
  console.log('🌐 Building Web App...');
  try {
    execSync('npm run build-web', { stdio: 'inherit' });
    console.log('✅ Web app build completed');
    return true;
  } catch (error) {
    console.log('❌ Web build failed:', error.message);
    return false;
  }
}

// Create download instructions
function createInstructions() {
  const version = getAppVersion();
  const instructions = `
# FLO Orders v${version} - Download Instructions

## Files Built:
- Android APK: Check EAS Build dashboard for download
- iOS IPA: Check EAS Build dashboard for download  
- Web App: Available in ./dist/ folder

## Next Steps:

1. **Download Built Files:**
   - Go to: https://expo.dev/accounts/[your-account]/projects/flo-orders/builds
   - Download the latest .apk and .ipa files

2. **Upload to Your Website:**
   - Upload website-download-page.html as your download page
   - Upload .apk and .ipa files to your server
   - Upload web app files from ./dist/ folder

3. **Update Download Links:**
   - Edit the download page HTML file
   - Update the JavaScript section with your file URLs:
     \`\`\`javascript
     document.getElementById('android-download').href = '/files/flo-orders-v${version}.apk';
     document.getElementById('ios-download').href = '/files/flo-orders-v${version}.ipa';
     document.getElementById('web-app').href = '/web-app/';
     \`\`\`

4. **Test Downloads:**
   - Test each download link
   - Verify installation on different devices
   - Check that all features work correctly

## File Naming Suggestions:
- Android: flo-orders-v${version}.apk
- iOS: flo-orders-v${version}.ipa
- Web: flo-orders-web-v${version}/

## Support:
- Read WEBSITE_DISTRIBUTION_GUIDE.md for complete setup
- Check installation guides for user instructions
`;

  fs.writeFileSync('BUILD_INSTRUCTIONS.md', instructions);
  console.log('📋 Created BUILD_INSTRUCTIONS.md');
}

// Main build function
async function main() {
  const version = getAppVersion();
  console.log(`🚀 Building FLO Orders v${version} for website distribution\n`);

  const buildOptions = process.argv.slice(2);
  
  if (buildOptions.length === 0) {
    console.log('📋 Available build options:');
    console.log('  --android    Build Android APK only');
    console.log('  --ios        Build iOS IPA only');
    console.log('  --web        Build Web App only');
    console.log('  --all        Build all platforms');
    console.log('\nExample: node build-for-website.js --all');
    return;
  }

  let success = true;

  if (buildOptions.includes('--android') || buildOptions.includes('--all')) {
    success = await buildAndroid() && success;
  }

  if (buildOptions.includes('--ios') || buildOptions.includes('--all')) {
    success = await buildIOS() && success;
  }

  if (buildOptions.includes('--web') || buildOptions.includes('--all')) {
    success = await buildWeb() && success;
  }

  if (success) {
    console.log('\n🎉 Build process completed successfully!');
    createInstructions();
    
    console.log('\n📋 Next Steps:');
    console.log('1. Check EAS Build dashboard for mobile app files');
    console.log('2. Upload files to your website');
    console.log('3. Update download page links');
    console.log('4. Test all download links');
    console.log('\n📖 Read BUILD_INSTRUCTIONS.md for detailed steps');
  } else {
    console.log('\n❌ Some builds failed. Check the errors above.');
  }
}

// Handle command line arguments
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { buildAndroid, buildIOS, buildWeb, getAppVersion };
