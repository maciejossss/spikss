// 🌍 API Configuration for Mobile App
// Automatically detects Railway vs localhost environment

const API_CONFIG = (() => {
  const isRailway = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const currentHost = window.location.origin;
  
  console.log('🌍 Environment Detection:');
  console.log(`   Host: ${window.location.hostname}`);
  console.log(`   Railway: ${isRailway}`);
  console.log(`   Origin: ${currentHost}`);
  
  if (isRailway) {
    // Production Railway environment
    return {
      // API endpoints on same Railway deployment
      technicians: `${currentHost}/api/technicians`,
      orders: (userId) => `${currentHost}/api/desktop/orders/${userId}`,
      updateOrder: (orderId) => `${currentHost}/api/desktop/orders/${orderId}/status`,
      health: `${currentHost}/api/health`,
      serviceCategories: `${currentHost}/api/service-categories`,
      // Device files (photos, PDFs) for a given device
      deviceFiles: (deviceId) => `${currentHost}/api/devices/${deviceId}/files`,
      
      // Desktop fallback (if user runs desktop locally while using Railway mobile)
      desktop: 'http://localhost:5174',
      
      environment: 'railway'
    };
  } else {
    // Development localhost environment  
    return {
      // Try Railway first, fallback to localhost
      technicians: `${currentHost}/api/technicians`,
      orders: (userId) => `${currentHost}/api/desktop/orders/${userId}`,
      updateOrder: (orderId) => `${currentHost}/api/desktop/orders/${orderId}/status`,
      health: `${currentHost}/api/health`,
      serviceCategories: `${currentHost}/api/service-categories`,
      // Device files (photos, PDFs) for a given device
      deviceFiles: (deviceId) => `${currentHost}/api/devices/${deviceId}/files`,
      
      // Local desktop for development
      desktop: 'http://localhost:5174',
      
      environment: 'localhost'
    };
  }
})();

// Export for global use
window.API_CONFIG = API_CONFIG;

console.log('🚀 API Config loaded:', API_CONFIG.environment);
console.log('📍 Endpoints:', {
  technicians: API_CONFIG.technicians,
  health: API_CONFIG.health
}); 