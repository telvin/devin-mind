// electron-entry.js (CommonJS wrapper for ESM main.js)
(async () => {
  await import('./main.js');
})();