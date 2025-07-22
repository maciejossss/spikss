const { Pool } = require('pg');

class DatabaseConnection {
  constructor() {
    this.pool = null;
    this.init();
  }

  init() {
    const config = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
      connectionTimeoutMillis: 2000, // How long to wait for a connection
    };

    this.pool = new Pool(config);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle client:', err);
    });

    console.log('✅ PostgreSQL connection pool initialized');
  }

  // Test database connection
  async testConnection() {
    try {
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
    const result = await this.query(text, params);
    return {
      rowCount: result.rowCount,
      insertId: result.rows[0]?.id || null
    };
  }

  // Begin transaction
  async beginTransaction() {
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