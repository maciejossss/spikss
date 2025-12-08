require('dotenv').config();

// Entrypoint for Railway: delegate to the actual API server
try {
  require('./desktop/railway-backend/server');
} catch (err) {
  console.error('Failed to start backend server:', err);
  process.exit(1);
}

 
