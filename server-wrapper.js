// CommonJS wrapper for ES module server
// This file is used by iisnode which doesn't fully support ES modules

import('./src/server.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
