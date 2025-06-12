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
        this.connectionRetries = 0;
        this.maxRetries = 3;
        this.retryDelay = 5000; // 5 seconds
    }

    /**
     * Initialize database connection pool
     */
    async initialize() {
        try {
            console.log('Starting database initialization...');
            
            console.log('Database connection environment variables:', {
                DATABASE_URL: process.env.DATABASE_URL ? '[HIDDEN]' : undefined,
                NODE_ENV: process.env.NODE_ENV,
                SKIP_DB_INIT: process.env.SKIP_DB_INIT
            });

            const config = this.getConnectionConfig();
            console.log('Database configuration (without sensitive data):', {
                ...config,
                password: '[HIDDEN]',
                connectionString: config.connectionString ? config.connectionString.replace(/:[^:]+@/, ':****@') : undefined
            });

            this.pool = new Pool(config);

            // Add error handler for the pool
            this.pool.on('error', (err) => {
                console.error('Unexpected error on idle client', err);
                this.isConnected = false;
                this.reconnect();
            });

            // Test connection immediately
            console.log('Testing initial connection...');
            await this.testConnection();
            
            this.isConnected = true;
            console.log('Database connection successful!');
            ModuleErrorHandler.logger.info('Database connection pool initialized successfully');

            // Setup periodic connection check
            setInterval(async () => {
                try {
                    await this.testConnection();
                } catch (error) {
                    console.error('Periodic connection check failed:', error);
                    this.isConnected = false;
                    await this.reconnect();
                }
            }, 30000); // Check every 30 seconds

        } catch (error) {
            ModuleErrorHandler.logger.error('Failed to initialize database:', error);
            console.error('Detailed connection error:', {
                code: error.code,
                message: error.message,
                detail: error.detail,
                hint: error.hint,
                position: error.position
            });

            if (this.connectionRetries < this.maxRetries) {
                ModuleErrorHandler.logger.info(`Retrying connection attempt ${this.connectionRetries + 1} of ${this.maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                this.connectionRetries++;
                return this.initialize();
            }

            if (process.env.NODE_ENV === 'production') {
                ModuleErrorHandler.logger.warn('Continuing despite database initialization error in production');
                throw error; // W produkcji lepiej rzucić błąd niż kontynuować bez bazy
            } else {
                throw error;
            }
        }
    }

    /**
     * Get database connection configuration
     */
    getConnectionConfig() {
        if (process.env.DATABASE_URL) {
            const config = {
                connectionString: process.env.DATABASE_URL,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                min: parseInt(process.env.DB_POOL_MIN) || 2,
                max: parseInt(process.env.DB_POOL_MAX) || 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
            };
            
            // Log the configuration without sensitive data
            console.log('Using DATABASE_URL configuration:', {
                ...config,
                connectionString: config.connectionString.replace(/:[^:]+@/, ':****@')
            });
            
            return config;
        }

        // Fallback to individual connection parameters
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
            connectionTimeoutMillis: 5000,
        };

        // Log the configuration without sensitive data
        console.log('Using individual parameters configuration:', {
            ...config,
            password: '[HIDDEN]'
        });

        return config;
    }

    /**
     * Test database connection
     */
    async testConnection() {
        console.log('Testing database connection...');
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT NOW() as now, current_database() as database, version() as version');
            console.log('Database connection test result:', {
                timestamp: result.rows[0].now,
                database: result.rows[0].database,
                version: result.rows[0].version
            });
        } finally {
            client.release();
        }
    }

    /**
     * Attempt to reconnect to database
     */
    async reconnect() {
        ModuleErrorHandler.logger.info('Attempting to reconnect to database...');
        try {
            await this.close();
            await this.initialize();
        } catch (error) {
            ModuleErrorHandler.logger.error('Failed to reconnect:', error);
        }
    }

    /**
     * Execute query with error handling
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
     */
    async healthCheck() {
        try {
            const result = await this.query('SELECT NOW() as current_time, version() as version');
            return {
                status: 'healthy',
                connected: this.isConnected,
                poolInfo: this.getPoolStats(),
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