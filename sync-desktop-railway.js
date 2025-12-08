const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Railway API configuration
const RAILWAY_API_BASE = 'https://web-production-fc58d.up.railway.app/api';

class DesktopRailwaySync {
  constructor() {
    // Use standard path for SQLite database
    this.localDbPath = path.join(process.env.APPDATA || process.env.HOME, 'serwis-desktop', 'serwis.db');
    this.localDb = null;
  }

  // Initialize local database connection
  async initLocalDb() {
    return new Promise((resolve, reject) => {
      this.localDb = new sqlite3.Database(this.localDbPath, (err) => {
        if (err) {
          console.error('❌ Local database connection error:', err);
          reject(err);
        } else {
          console.log('✅ Connected to local SQLite database');
          resolve();
        }
      });
    });
  }

  // Check Railway API connection
  async checkRailwayConnection() {
    try {
      const response = await fetch(`${RAILWAY_API_BASE}/health`);
      if (response.ok) {
        console.log('✅ Railway API connection successful');
        return true;
      } else {
        console.log('❌ Railway API connection failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Railway API connection error:', error);
      return false;
    }
  }

  // Sync orders from local to Railway
  async syncOrdersToRailway() {
    try {
      console.log('📤 Syncing orders to Railway...');
      
      // Get orders from local database
      const orders = await this.getLocalOrders();
      console.log(`Found ${orders.length} orders to sync`);
      
      for (const order of orders) {
        try {
          const response = await fetch(`${RAILWAY_API_BASE}/sync/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orders: [order]
            })
          });
          
          if (response.ok) {
            console.log(`✅ Synced order: ${order.order_number}`);
          } else {
            console.log(`❌ Failed to sync order: ${order.order_number}`);
          }
        } catch (error) {
          console.error(`❌ Error syncing order ${order.order_number}:`, error);
        }
      }
      
      console.log('📤 Order sync completed');
    } catch (error) {
      console.error('❌ Order sync error:', error);
    }
  }

  // Get orders from local database
  getLocalOrders() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          so.*,
          c.first_name || ' ' || c.last_name as client_name,
          c.phone as client_phone,
          c.address as client_address,
          d.name as device_name,
          d.manufacturer as device_manufacturer,
          d.model as device_model
        FROM service_orders so
        LEFT JOIN clients c ON so.client_id = c.id
        LEFT JOIN devices d ON so.device_id = d.id
        ORDER BY so.created_at DESC
      `;
      
      this.localDb.all(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get orders from Railway
  async getRailwayOrders(technicianId) {
    try {
      const response = await fetch(`${RAILWAY_API_BASE}/desktop/orders/${technicianId}`);
      if (response.ok) {
        const orders = await response.json();
        console.log(`📥 Retrieved ${orders.length} orders from Railway`);
        return orders;
      } else {
        console.log('❌ Failed to get orders from Railway');
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting Railway orders:', error);
      return [];
    }
  }

  // Sync technicians
  async syncTechnicians() {
    try {
      console.log('👥 Syncing technicians...');
      
      const response = await fetch(`${RAILWAY_API_BASE}/technicians`);
      if (response.ok) {
        const technicians = await response.json();
        console.log(`✅ Retrieved ${technicians.length} technicians from Railway`);
        return technicians;
      } else {
        console.log('❌ Failed to get technicians from Railway');
        return [];
      }
    } catch (error) {
      console.error('❌ Error syncing technicians:', error);
      return [];
    }
  }

  // Main sync function
  async syncAll() {
    try {
      console.log('🔄 Starting Desktop-Railway sync...');
      
      // Check connections
      await this.initLocalDb();
      const railwayConnected = await this.checkRailwayConnection();
      
      if (!railwayConnected) {
        console.log('❌ Railway not available, sync cancelled');
        return;
      }
      
      // Sync orders to Railway
      await this.syncOrdersToRailway();
      
      // Get technicians from Railway
      const technicians = await this.syncTechnicians();
      
      console.log('✅ Desktop-Railway sync completed');
      
      return {
        success: true,
        technicians: technicians,
        railwayConnected: true
      };
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      if (this.localDb) {
        this.localDb.close();
      }
    }
  }
}

// Export for use in Electron
module.exports = DesktopRailwaySync;

// If run directly, execute sync
if (require.main === module) {
  const sync = new DesktopRailwaySync();
  sync.syncAll().then(result => {
    console.log('Sync result:', result);
    process.exit(0);
  }).catch(error => {
    console.error('Sync failed:', error);
    process.exit(1);
  });
} 