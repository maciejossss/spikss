/**
 * PARTS MODULE CONTROLLER
 * Following RULE 2: Error isolation with try-catch in every method
 */

const ModuleErrorHandler = require('../../../shared/error/ModuleErrorHandler');
const DatabaseService = require('../../../shared/database/database');

class PartsController {
    constructor() {
        this.moduleName = 'parts';
    }

    /**
     * Get all parts
     */
    async getAll(req, res) {
        try {
            // W trybie demo zwracamy przykładowe dane
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    data: [
                        {
                            id: 1,
                            name: 'Palnik gazowy Weishaupt WG20',
                            category: 'Palniki',
                            stock: 5,
                            price: 2500.00,
                            supplier: 'Weishaupt'
                        },
                        {
                            id: 2,
                            name: 'Zawór bezpieczeństwa 3 bar',
                            category: 'Armatura',
                            stock: 15,
                            price: 120.00,
                            supplier: 'Honeywell'
                        }
                    ],
                    total: 2
                });
            }

            const result = await DatabaseService.query(
                'SELECT * FROM parts ORDER BY name ASC'
            );

            res.json({
                success: true,
                data: result.rows,
                total: result.rowCount
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Get part by ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    data: {
                        id: parseInt(id),
                        name: 'Palnik gazowy Weishaupt WG20',
                        category: 'Palniki',
                        stock: 5,
                        price: 2500.00,
                        supplier: 'Weishaupt',
                        description: 'Palnik gazowy z modulacją mocy'
                    }
                });
            }

            const result = await DatabaseService.query(
                'SELECT * FROM parts WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Part not found'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Create new part
     */
    async create(req, res) {
        try {
            const { name, category, stock, price, supplier, description } = req.body;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.status(201).json({
                    success: true,
                    data: {
                        id: Date.now(),
                        name,
                        category,
                        stock,
                        price,
                        supplier,
                        description,
                        created_at: new Date().toISOString()
                    }
                });
            }

            const result = await DatabaseService.query(
                `INSERT INTO parts (name, category, stock, price, supplier, description)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [name, category, stock, price, supplier, description]
            );

            res.status(201).json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Update part
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, category, stock, price, supplier, description } = req.body;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    data: {
                        id: parseInt(id),
                        name,
                        category,
                        stock,
                        price,
                        supplier,
                        description,
                        updated_at: new Date().toISOString()
                    }
                });
            }

            const result = await DatabaseService.query(
                `UPDATE parts 
                 SET name = $1, category = $2, stock = $3, price = $4, 
                     supplier = $5, description = $6, updated_at = NOW()
                 WHERE id = $7
                 RETURNING *`,
                [name, category, stock, price, supplier, description, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Part not found'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Delete part
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    message: 'Part deleted successfully'
                });
            }

            const result = await DatabaseService.query(
                'DELETE FROM parts WHERE id = $1 RETURNING id',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Part not found'
                });
            }

            res.json({
                success: true,
                message: 'Part deleted successfully'
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Search parts
     */
    async search(req, res) {
        try {
            const { query } = req.query;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    data: [],
                    total: 0
                });
            }

            const result = await DatabaseService.query(
                `SELECT * FROM parts 
                 WHERE name ILIKE $1 OR description ILIKE $1 OR supplier ILIKE $1
                 ORDER BY name ASC`,
                [`%${query}%`]
            );

            res.json({
                success: true,
                data: result.rows,
                total: result.rowCount
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Get low stock parts
     */
    async getLowStock(req, res) {
        try {
            const threshold = req.query.threshold || 10;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    data: [
                        {
                            id: 3,
                            name: 'Elektroda zapłonowa',
                            stock: 2,
                            min_stock: 5
                        }
                    ],
                    total: 1
                });
            }

            const result = await DatabaseService.query(
                'SELECT * FROM parts WHERE stock < $1 ORDER BY stock ASC',
                [threshold]
            );

            res.json({
                success: true,
                data: result.rows,
                total: result.rowCount
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Restock part
     */
    async restock(req, res) {
        try {
            const { id } = req.params;
            const { quantity } = req.body;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    message: 'Part restocked successfully',
                    data: {
                        id: parseInt(id),
                        new_stock: 25
                    }
                });
            }

            const result = await DatabaseService.query(
                `UPDATE parts 
                 SET stock = stock + $1, updated_at = NOW()
                 WHERE id = $2
                 RETURNING id, stock`,
                [quantity, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Part not found'
                });
            }

            res.json({
                success: true,
                message: 'Part restocked successfully',
                data: result.rows[0]
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Get categories
     */
    async getCategories(req, res) {
        try {
            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    data: [
                        'Palniki',
                        'Armatura',
                        'Elektronika',
                        'Części zamienne',
                        'Materiały eksploatacyjne'
                    ]
                });
            }

            const result = await DatabaseService.query(
                'SELECT DISTINCT category FROM parts ORDER BY category ASC'
            );

            res.json({
                success: true,
                data: result.rows.map(row => row.category)
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }
}

module.exports = PartsController; 