// electron-entry.js (CommonJS wrapper for ESM main.js)
const { pathToFileURL } = require('url');
const path = require('path');

(async () => {
  try {
    // Convert file path to file URL for proper ES module loading in asar
    const mainPath = path.join(__dirname, 'main.js');
    const mainUrl = pathToFileURL(mainPath).href;
    console.log('Loading main.js from URL:', mainUrl);
    
    await import(mainUrl);
  } catch (error) {
    console.error('Failed to load main.js:', error);
    process.exit(1);
  }
})();