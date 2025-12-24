#!/usr/bin/env node

/**
 * iOS Distribution Starter Script
 * Helps you get your iOS app distributed immediately
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('📱 FLO Orders - iOS Distribution Starter');
console.log('=====================================\n');

// Check if we can start Expo Go
function startExpoGo() {
  console.log('🚀 Starting Expo Go for instant iPhone/iPad testing...\n');
  
  try {
    console.log('📋 Instructions for iPhone/iPad users:');
    console.log('1. Download "Expo Go" app from App Store (free)');
    console.log('2. Open Expo Go app');
    console.log('3. Scan the QR code that appears below');
    console.log('4. Your FLO Orders app will load instantly!\n');
    
    console.log('🔄 Starting development server...\n');
    
    // Start Expo Go
    execSync('npx expo start', { stdio: 'inherit' });
    
  } catch (error) {
    console.log('❌ Failed to start Expo Go:', error.message);
    console.log('\n💡 Try running: npm run expo-go');
  }
}

// Check build status
function checkBuildStatus() {
  console.log('📊 Checking EAS Build status...\n');
  
  try {
    execSync('eas build:list --limit=5', { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Could not check build status');
    console.log('💡 Visit: https://expo.dev/accounts/tondekawere/projects/flo-orders/builds');
  }
}

// Show distribution options
function showOptions() {
  console.log('📱 iOS Distribution Options:');
  console.log('===========================\n');
  
  console.log('1. 🚀 Expo Go (Ready Now!)');
  console.log('   - Instant testing on iPhone/iPad');
  console.log('   - No build required');
  console.log('   - Perfect for demos and feedback');
  console.log('   - Command: npm run expo-go\n');
  
  console.log('2. 📦 IPA File (Needs Apple Account)');
  console.log('   - Native iOS app file');
  console.log('   - Requires Apple Developer Account ($99/year)');
  console.log('   - For website distribution');
  console.log('   - Command: eas build --platform ios --profile preview\n');
  
  console.log('3. 🌐 Web App (Already Built!)');
  console.log('   - Works in iPhone Safari');
  console.log('   - Can be installed as PWA');
  console.log('   - Files ready in dist/ folder');
  console.log('   - Upload to your website\n');
  
  console.log('4. ✈️ TestFlight (Needs Apple Account)');
  console.log('   - Official Apple beta testing');
  console.log('   - Professional distribution');
  console.log('   - Up to 10,000 testers');
  console.log('   - Command: eas build --platform ios --profile testflight\n');
}

// Main menu
function showMenu() {
  console.log('🎯 What would you like to do?');
  console.log('1. Start Expo Go (Instant iPhone testing)');
  console.log('2. Check build status');
  console.log('3. Show all distribution options');
  console.log('4. Exit\n');
}

// Handle command line arguments
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--expo-go') || args.includes('--start')) {
    startExpoGo();
    return;
  }
  
  if (args.includes('--status')) {
    checkBuildStatus();
    return;
  }
  
  if (args.includes('--options')) {
    showOptions();
    return;
  }
  
  // Default: show options and start Expo Go
  showOptions();
  
  console.log('🚀 Recommended: Start with Expo Go for immediate testing');
  console.log('📱 iPhone/iPad users can test your app in under 2 minutes!\n');
  
  console.log('💡 To start Expo Go now, run:');
  console.log('   npm run expo-go\n');
  
  console.log('📖 For complete guide, read: CREATE_IPA_GUIDE.md');
}

// Run the script
main();
