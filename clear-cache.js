// Clear Node.js module cache
console.log('🧹 Clearing Node.js module cache...');

// Delete all cached modules
Object.keys(require.cache).forEach(function(key) {
    delete require.cache[key];
});

console.log('✅ Module cache cleared!');
console.log('🔄 Restarting application...');

// Restart the application
require('./src/app.js'); 