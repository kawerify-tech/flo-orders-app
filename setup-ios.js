#!/usr/bin/env node

/**
 * iOS Setup Script for FLO Orders
 * This script helps you set up iOS builds and installations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🍎 FLO Orders - iOS Setup Script');
console.log('================================\n');

// Check if EAS CLI is installed
function checkEASCLI() {
  try {
    execSync('eas --version', { stdio: 'ignore' });
    console.log('✅ EAS CLI is installed');
    return true;
  } catch (error) {
    console.log('❌ EAS CLI not found');
    return false;
  }
}

// Install EAS CLI
function installEASCLI() {
  console.log('📦 Installing EAS CLI...');
  try {
    execSync('npm install -g @expo/eas-cli', { stdio: 'inherit' });
    console.log('✅ EAS CLI installed successfully');
  } catch (error) {
    console.log('❌ Failed to install EAS CLI');
    process.exit(1);
  }
}

// Check Expo login status
function checkExpoLogin() {
  try {
    execSync('eas whoami', { stdio: 'ignore' });
    console.log('✅ Logged in to Expo');
    return true;
  } catch (error) {
    console.log('❌ Not logged in to Expo');
    return false;
  }
}

// Login to Expo
function loginToExpo() {
  console.log('🔐 Please login to your Expo account...');
  try {
    execSync('eas login', { stdio: 'inherit' });
    console.log('✅ Successfully logged in to Expo');
  } catch (error) {
    console.log('❌ Failed to login to Expo');
    process.exit(1);
  }
}

// Configure project for EAS
function configureEAS() {
  console.log('⚙️ Configuring project for EAS Build...');
  try {
    execSync('eas build:configure', { stdio: 'inherit' });
    console.log('✅ EAS Build configured');
  } catch (error) {
    console.log('❌ Failed to configure EAS Build');
    process.exit(1);
  }
}

// Display build options
function displayBuildOptions() {
  console.log('\n🚀 Available Build Options:');
  console.log('==========================');
  console.log('1. Development Build (for registered devices)');
  console.log('   Command: eas build --platform ios --profile development');
  console.log('');
  console.log('2. Preview Build (for internal testing)');
  console.log('   Command: eas build --platform ios --profile preview');
  console.log('');
  console.log('3. TestFlight Build (for beta testing)');
  console.log('   Command: eas build --platform ios --profile testflight');
  console.log('');
  console.log('4. Production Build (for App Store)');
  console.log('   Command: eas build --platform ios --profile production');
  console.log('');
}

// Display next steps
function displayNextSteps() {
  console.log('📋 Next Steps:');
  console.log('==============');
  console.log('1. Set up your Apple Developer Account ($99/year)');
  console.log('2. Update eas.json with your Apple Developer details:');
  console.log('   - Apple ID email');
  console.log('   - App Store Connect App ID');
  console.log('   - Apple Team ID');
  console.log('3. Choose a build profile and run the build command');
  console.log('4. Follow the iPhone Installation Guide for detailed steps');
  console.log('');
  console.log('📖 Read IPHONE_INSTALLATION_GUIDE.md for complete instructions');
  console.log('');
}

// Main setup function
async function main() {
  try {
    // Check and install EAS CLI
    if (!checkEASCLI()) {
      installEASCLI();
    }

    // Check and handle Expo login
    if (!checkExpoLogin()) {
      loginToExpo();
    }

    // Configure EAS if needed
    if (!fs.existsSync(path.join(__dirname, 'eas.json'))) {
      configureEAS();
    } else {
      console.log('✅ EAS configuration already exists');
    }

    console.log('\n🎉 iOS setup completed successfully!');
    
    displayBuildOptions();
    displayNextSteps();

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
main();
