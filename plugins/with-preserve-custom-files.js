const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to preserve custom files during prebuild
 * This ensures files like google-services.json are preserved when native folders are regenerated
 */
const withPreserveCustomFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const customFiles = [
        'android/app/google-services.json',
        'android/app/debug.keystore',
        'android/app/proguard-rules.pro',
      ];

      // Create backup directory
      const backupDir = path.join(projectRoot, '.expo-backup');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Backup custom files before prebuild
      customFiles.forEach((filePath) => {
        const fullPath = path.join(config.modRequest.projectRoot, filePath);
        if (fs.existsSync(fullPath)) {
          const backupPath = path.join(backupDir, path.basename(filePath));
          fs.copyFileSync(fullPath, backupPath);
        }
      });

      return config;
    },
  ]);
};

module.exports = withPreserveCustomFiles;

