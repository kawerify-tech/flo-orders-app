const fs = require('fs');
const path = require('path');

const checkRequiredFiles = () => {
  const requiredFiles = [
    'assets/images/flo-logo.png',
    'assets/images/adaptive-icon.png',
    'assets/images/splash.png',
    'google-services.json'
  ];

  const missingFiles = requiredFiles.filter(file => 
    !fs.existsSync(path.join(__dirname, '..', file))
  );

  if (missingFiles.length > 0) {
    console.error('Missing required files:', missingFiles);
    process.exit(1);
  }
};

checkRequiredFiles(); 