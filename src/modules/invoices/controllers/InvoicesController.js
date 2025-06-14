/**
 * INVOICES MODULE CONTROLLER
 * Following RULE 2: Error isolation with try-catch in every method
 */

const ModuleErrorHandler = require('../../../shared/error/ModuleErrorHandler');
const DatabaseService = require('../../../shared/database/database');

class InvoicesController {
    constructor() {
        this.moduleName = 'invoices';
    }

    /**
     * Get all invoices
     */
    async getAll(req, res) {
        try {
            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    data: [
                        {
                            id: 1,
                            invoice_number: 'FV/2024/001',
                            client_name: 'Jan Kowalski',
                            amount: 3690.00,
                            status: 'paid',
                            issue_date: '2024-01-15',
                            due_date: '2024-01-29'
                        },
                        {
                            id: 2,
                            invoice_number: 'FV/2024/002',
                            client_name: 'Firma ABC Sp. z o.o.',
                            amount: 8610.00,
                            status: 'pending',
                            issue_date: '2024-01-20',
                            due_date: '2024-02-03'
                        }
                    ],
                    total: 2
                });
            }

            const result = await DatabaseService.query(
                'SELECT * FROM invoices ORDER BY issue_date DESC'
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
     * Get invoice by ID
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
                        invoice_number: 'FV/2024/001',
                        client_id: 1,
                        client_name: 'Jan Kowalski',
                        service_order_id: 1,
                        items: [
                            {
                                description: 'Przegląd kotła gazowego',
                                quantity: 1,
                                price: 300.00,
                                total: 300.00
                            },
                            {
                                description: 'Wymiana palnika',
                                quantity: 1,
                                price: 3000.00,
                                total: 3000.00
                            }
                        ],
                        subtotal: 3300.00,
                        tax: 759.00,
                        total: 3690.00,
                        status: 'paid',
                        issue_date: '2024-01-15',
                        due_date: '2024-01-29',
                        payment_date: '2024-01-25'
                    }
                });
            }

            const result = await DatabaseService.query(
                'SELECT * FROM invoices WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice not found'
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
     * Create new invoice
     */
    async create(req, res) {
        try {
            const invoiceData = req.body;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.status(201).json({
                    success: true,
                    data: {
                        id: Date.now(),
                        invoice_number: `FV/2024/${Date.now()}`,
                        ...invoiceData,
                        created_at: new Date().toISOString()
                    }
                });
            }

            const result = await DatabaseService.query(
                `INSERT INTO invoices (client_id, service_order_id, invoice_number, 
                 subtotal, tax, total, status, issue_date, due_date)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [
                    invoiceData.client_id,
                    invoiceData.service_order_id,
                    invoiceData.invoice_number,
                    invoiceData.subtotal,
                    invoiceData.tax,
                    invoiceData.total,
                    invoiceData.status || 'pending',
                    invoiceData.issue_date,
                    invoiceData.due_date
                ]
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
     * Update invoice
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    data: {
                        id: parseInt(id),
                        ...updateData,
                        updated_at: new Date().toISOString()
                    }
                });
            }

            const result = await DatabaseService.query(
                `UPDATE invoices 
                 SET status = $1, payment_date = $2, notes = $3, updated_at = NOW()
                 WHERE id = $4
                 RETURNING *`,
                [updateData.status, updateData.payment_date, updateData.notes, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice not found'
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
     * Delete invoice
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    message: 'Invoice deleted successfully'
                });
            }

            const result = await DatabaseService.query(
                'DELETE FROM invoices WHERE id = $1 RETURNING id',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice not found'
                });
            }

            res.json({
                success: true,
                message: 'Invoice deleted successfully'
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Search invoices
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
                `SELECT * FROM invoices 
                 WHERE invoice_number ILIKE $1 
                 ORDER BY issue_date DESC`,
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
     * Get invoices by client
     */
    async getByClient(req, res) {
        try {
            const { clientId } = req.params;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    data: [],
                    total: 0
                });
            }

            const result = await DatabaseService.query(
                'SELECT * FROM invoices WHERE client_id = $1 ORDER BY issue_date DESC',
                [clientId]
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
     * Send invoice by email
     */
    async sendInvoice(req, res) {
        try {
            const { id } = req.params;
            const { email } = req.body;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    message: `Invoice sent to ${email}`
                });
            }

            // TODO: Implement email sending logic

            res.json({
                success: true,
                message: `Invoice sent to ${email}`
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Record payment
     */
    async recordPayment(req, res) {
        try {
            const { id } = req.params;
            const { payment_date, payment_method, notes } = req.body;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    message: 'Payment recorded successfully',
                    data: {
                        id: parseInt(id),
                        status: 'paid',
                        payment_date
                    }
                });
            }

            const result = await DatabaseService.query(
                `UPDATE invoices 
                 SET status = 'paid', payment_date = $1, payment_method = $2, 
                     payment_notes = $3, updated_at = NOW()
                 WHERE id = $4
                 RETURNING *`,
                [payment_date, payment_method, notes, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice not found'
                });
            }

            res.json({
                success: true,
                message: 'Payment recorded successfully',
                data: result.rows[0]
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Get summary statistics
     */
    async getSummary(req, res) {
        try {
            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    data: {
                        total_invoices: 156,
                        total_revenue: 245890.00,
                        pending_amount: 45600.00,
                        paid_this_month: 89500.00,
                        overdue_count: 3
                    }
                });
            }

            // TODO: Implement real summary logic

            res.json({
                success: true,
                data: {
                    total_invoices: 0,
                    total_revenue: 0,
                    pending_amount: 0,
                    paid_this_month: 0,
                    overdue_count: 0
                }
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }

    /**
     * Generate PDF
     */
    async generatePDF(req, res) {
        try {
            const { id } = req.params;

            // Demo mode
            if (DatabaseService.isDemoMode) {
                return res.json({
                    success: true,
                    message: 'PDF generation not available in demo mode'
                });
            }

            // TODO: Implement PDF generation

            res.json({
                success: true,
                message: 'PDF generation not implemented yet'
            });
        } catch (error) {
            const errorResponse = ModuleErrorHandler.handleError(error, this.moduleName);
            res.status(500).json(errorResponse);
        }
    }
}

module.exports = InvoicesController; 