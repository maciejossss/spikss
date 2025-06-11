/**
 * RULE 3: DATABASE ISOLATION
 * Central database connection service with connection pooling
 * Each module will have its own database service extending this base
 */

const { Pool } = require('pg');
const ModuleErrorHandler = require('../error/ModuleErrorHandler');

class DatabaseService {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    /**
     * Initialize database connection pool
     */
    async initialize() {
        try {
            // Log all environment variables related to database connection
            console.log('Database connection environment variables:');
            console.log({
                PGHOST: process.env.PGHOST,
                PGPORT: process.env.PGPORT,
                PGDATABASE: process.env.PGDATABASE,
                PGUSER: process.env.PGUSER,
                NODE_ENV: process.env.NODE_ENV,
                // Don't log the password!
            });

            // Check required environment variables
            const requiredEnvVars = ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
            const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
            
            if (missingEnvVars.length > 0) {
                throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
            }

            const config = {
                host: process.env.PGHOST,
                port: parseInt(process.env.PGPORT) || 5432,
                database: process.env.PGDATABASE,
                user: process.env.PGUSER,
                password: process.env.PGPASSWORD,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                min: parseInt(process.env.DB_POOL_MIN) || 2,
                max: parseInt(process.env.DB_POOL_MAX) || 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            };

            console.log('Database configuration (without sensitive data):', {
                ...config,
                password: '[HIDDEN]'
            });

            this.pool = new Pool(config);

            // Test connection
            console.log('Attempting to connect to database...');
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW()');
            console.log('Database connection test successful:', result.rows[0]);
            client.release();

            this.isConnected = true;
            ModuleErrorHandler.logger.info('Database connection pool initialized successfully');
        } catch (error) {
            ModuleErrorHandler.logger.error('Failed to initialize database:', error);
            console.error('Detailed connection error:', {
                code: error.code,
                message: error.message,
                detail: error.detail,
                hint: error.hint,
                position: error.position
            });
            
            if (process.env.NODE_ENV === 'production') {
                ModuleErrorHandler.logger.warn('Continuing despite database initialization error in production');
            } else {
                throw error;
            }
        }
    }

    /**
     * Execute query with error handling
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async query(query, params = []) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }

        const client = await this.pool.connect();
        try {
            const start = Date.now();
            const result = await client.query(query, params);
            const duration = Date.now() - start;

            ModuleErrorHandler.logger.debug('Query executed', {
                query: query.substring(0, 100) + '...',
                duration,
                rowCount: result.rowCount
            });

            return result;
        } finally {
            client.release();
        }
    }

    /**
     * Execute transaction
     * @param {Function} callback - Function to execute within transaction
     * @returns {Promise<any>} Transaction result
     */
    async transaction(callback) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Health check for database
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            const result = await this.query('SELECT NOW() as current_time, version() as version');
            return {
                status: 'healthy',
                connected: this.isConnected,
                poolInfo: {
                    totalCount: this.pool.totalCount,
                    idleCount: this.pool.idleCount,
                    waitingCount: this.pool.waitingCount
                },
                serverInfo: {
                    currentTime: result.rows[0].current_time,
                    version: result.rows[0].version.split(' ')[0]
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message
            };
        }
    }

    /**
     * Close database connection
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            ModuleErrorHandler.logger.info('Database connection closed');
        }
    }

    /**
     * Get connection pool stats
     * @returns {Object} Pool statistics
     */
    getPoolStats() {
        if (!this.pool) return null;
        
        return {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount
        };
    }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService; 