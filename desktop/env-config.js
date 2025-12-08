// Desktop App Environment Configuration
export const config = {
  // API Endpoints
  RAILWAY_API_BASE: 'https://web-production-fc58d.up.railway.app/api',
  LOCAL_API_BASE: 'http://localhost:5174/api',
  
  // Database Configuration
  DATABASE_URL: 'postgresql://postgres:RejcVvKxoptptXgEpWDDwuKBDwgokfwb@shuttle.proxy.rlwy.net:15442/railway',
  
  // Development Settings
  NODE_ENV: 'development',
  USE_LOCAL_DB: true,
  SYNC_WITH_RAILWAY: true,
  
  // App Settings
  APP_NAME: 'System Serwisowy',
  VERSION: '1.0.0',

  // Map module configuration
  MAP: {
    ENABLED: true,
    TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    TILE_ATTRIBUTION: '&copy; OpenStreetMap contributors',
    MIN_ZOOM: 4,
    MAX_ZOOM: 18,
    DEFAULT_ZOOM: 6,
    GEO_FALLBACK_CENTER: [52.237049, 21.017532], // Warszawa jako bezpieczne centrum
    GEOCODER_URL: 'https://nominatim.openstreetmap.org/search',
    GEOCODER_EMAIL: 'maciej1banaszak@gmail.com', // kontakt dla Nominatim
    CACHE_VERSION: 'v1'
  },
  
  // Railway Connection Status
  RAILWAY_CONNECTED: true,
  RAILWAY_URL: 'https://web-production-fc58d.up.railway.app',
  
  // Available Endpoints
  ENDPOINTS: {
    health: '/api/health',
    technicians: '/api/technicians',
    orders: '/api/desktop/orders',
    sync: '/api/sync'
  }
};

// Helper function to get API URL
export function getApiUrl(endpoint = '') {
  const baseUrl = config.RAILWAY_API_BASE;
  return `${baseUrl}${endpoint}`;
}

// Helper function to check Railway connection
export async function checkRailwayConnection() {
  try {
    const response = await fetch(config.RAILWAY_API_BASE + '/health');
    return response.ok;
  } catch (error) {
    console.error('Railway connection failed:', error);
    return false;
  }
}

export default config; 