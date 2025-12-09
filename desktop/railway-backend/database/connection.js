const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const loadDatabaseUrlFromEnvFiles = () => {
  if (process.env.DATABASE_URL && typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim()) {
    return;
  }

  const candidates = [
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env.local'),
    path.resolve(__dirname, '../../../.env')
  ];

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const match = line.match(/^DATABASE_URL\s*=\s*(.+)$/i);
        if (match) {
          const value = match[1].trim().replace(/^['"]|['"]$/g, '');
          if (value) {
            process.env.DATABASE_URL = value;
            console.log(`ℹ️ Loaded DATABASE_URL from ${path.basename(filePath)}`);
            return;
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to read ${filePath}:`, error?.message || error);
    }
  }
};

class DatabaseConnection {
  constructor() {
    this.pool = null;
    this.initialized = false;
    this.initError = null;
    loadDatabaseUrlFromEnvFiles();
    this.init();
  }

  ensurePool() {
    if (this.pool) {
      return;
    }
    const reason = this.initError || 'PostgreSQL connection not initialized';
    const error = new Error(`Railway connection unavailable: ${reason}`);
    error.code = 'RAILWAY_DB_NOT_AVAILABLE';
    throw error;
  }

  init() {
    const connectionString = process.env.DATABASE_URL;
    if (typeof connectionString !== 'string' || !connectionString.trim()) {
      this.initError = 'Missing DATABASE_URL';
      console.warn('⚠️ PostgreSQL connection skipped: DATABASE_URL not provided');
      return;
    }

    const config = {
      connectionString: connectionString.trim(),
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
      connectionTimeoutMillis: 2000, // How long to wait for a connection
    };

    try {
      this.pool = new Pool(config);

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('❌ Unexpected error on idle client:', err);
      });

      this.initialized = true;
      this.initError = null;
      console.log('✅ PostgreSQL connection pool initialized');
    } catch (error) {
      this.pool = null;
      this.initialized = false;
      this.initError = error?.message || 'Failed to initialize PostgreSQL connection';
      console.error('❌ Failed to initialize PostgreSQL pool:', error);
    }
  }

  isReady() {
    return this.initialized && !!this.pool;
  }

  getInitError() {
    return this.initError;
  }

  // Test database connection
  async testConnection() {
    try {
      this.ensurePool();
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      
      console.log('🔌 Database connection test successful:', result.rows[0].current_time);
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error.message);
      throw error;
    }
  }

  // Execute a query
  async query(text, params = []) {
    this.ensurePool();
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 SQL Query executed:', {
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration: `${duration}ms`,
          rows: result.rowCount
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Database query error:', {
        error: error.message,
        query: text.substring(0, 100),
        params: params
      });
      throw error;
    }
  }

  // Get a single row
  async get(text, params = []) {
    const result = await this.query(text, params);
    return result.rows[0] || null;
  }

  // Get all rows
  async all(text, params = []) {
    const result = await this.query(text, params);
    return result.rows;
  }

  // Execute a statement (INSERT, UPDATE, DELETE)
  async run(text, params = []) {
    this.ensurePool();
    const result = await this.query(text, params);
    return {
      rowCount: result.rowCount,
      insertId: result.rows[0]?.id || null
    };
  }

  // Begin transaction
  async beginTransaction() {
    this.ensurePool();
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  // Commit transaction
  async commitTransaction(client) {
    try {
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  }

  // Rollback transaction
  async rollbackTransaction(client) {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }

  // Close all connections
  async closeConnection() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Database connection pool closed');
    }
  }

  // Get pool status
  getPoolStatus() {
    if (!this.pool) return null;
    
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

// Export singleton instance
const db = new DatabaseConnection();
module.exports = db; 