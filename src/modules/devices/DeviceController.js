/**
 * RULE 4: API COMMUNICATION
 * Device Controller for System Serwisowy Palniki & Kotły
 * Handles HTTP requests for devices module
 */

const DeviceService = require('./DeviceService');
const ModuleErrorHandler = require('../../shared/error/ModuleErrorHandler');

class DeviceController {
    constructor() {
        this.deviceService = new DeviceService();
    }

    /**
     * Create new device
     * POST /api/devices
     */
    async createDevice(req, res) {
        try {
            // Get user ID from auth middleware (assumed to be set)
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            const device = await this.deviceService.createDevice(req.body, userId);
            
            res.status(201).json({
                success: true,
                data: device,
                message: 'Device created successfully'
            });

        } catch (error) {
            const isBusinessError = error.message.includes('required') || 
                                  error.message.includes('Invalid') ||
                                  error.message.includes('already exists') ||
                                  error.message.includes('must be');

            const statusCode = isBusinessError ? 400 : 500;
            
            ModuleErrorHandler.logger.error('Create device error:', error);
            
            res.status(statusCode).json({
                success: false,
                error: error.message || 'Failed to create device',
                type: isBusinessError ? 'validation_error' : 'server_error'
            });
        }
    }

    /**
     * Get devices with filters and pagination
     * GET /api/devices
     */
    async getDevices(req, res) {
        try {
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                search: req.query.search || '',
                client_id: req.query.client_id || null,
                client_search: req.query.client_search || '',
                device_type: req.query.device_type || null,
                brand: req.query.brand || null,
                status: req.query.status || null,
                next_service_overdue: req.query.next_service_overdue === 'true',
                sortBy: req.query.sortBy || 'created_at',
                sortOrder: req.query.sortOrder || 'DESC'
            };

            const result = await this.deviceService.getDevices(options);
            
            res.json({
                success: true,
                data: result.devices,
                pagination: result.pagination,
                filters: {
                    search: options.search,
                    client_id: options.client_id,
                    client_search: options.client_search,
                    device_type: options.device_type,
                    brand: options.brand,
                    status: options.status,
                    next_service_overdue: options.next_service_overdue
                }
            });

        } catch (error) {
            const isBusinessError = error.message.includes('must be') || 
                                  error.message.includes('Invalid');

            const statusCode = isBusinessError ? 400 : 500;
            
            ModuleErrorHandler.logger.error('Get devices error:', error);
            
            res.status(statusCode).json({
                success: false,
                error: error.message || 'Failed to fetch devices',
                type: isBusinessError ? 'validation_error' : 'server_error'
            });
        }
    }

    /**
     * Get device by ID
     * GET /api/devices/:id
     */
    async getDeviceById(req, res) {
        try {
            const deviceId = req.params.id;
            const device = await this.deviceService.getDeviceById(deviceId);
            
            if (!device) {
                return res.status(404).json({
                    success: false,
                    error: 'Device not found',
                    type: 'not_found'
                });
            }
            
            res.json({
                success: true,
                data: device
            });

        } catch (error) {
            ModuleErrorHandler.logger.error('Get device by ID error:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch device',
                type: 'server_error'
            });
        }
    }

    /**
     * Update device
     * PUT /api/devices/:id
     */
    async updateDevice(req, res) {
        try {
            const deviceId = req.params.id;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            const device = await this.deviceService.updateDevice(deviceId, req.body, userId);
            
            if (!device) {
                return res.status(404).json({
                    success: false,
                    error: 'Device not found',
                    type: 'not_found'
                });
            }
            
            res.json({
                success: true,
                data: device,
                message: 'Device updated successfully'
            });

        } catch (error) {
            const isBusinessError = error.message.includes('required') || 
                                  error.message.includes('Invalid') ||
                                  error.message.includes('already exists') ||
                                  error.message.includes('must be') ||
                                  error.message.includes('Cannot');

            const statusCode = isBusinessError ? 400 : 500;
            
            ModuleErrorHandler.logger.error('Update device error:', error);
            
            res.status(statusCode).json({
                success: false,
                error: error.message || 'Failed to update device',
                type: isBusinessError ? 'validation_error' : 'server_error'
            });
        }
    }

    /**
     * Delete device
     * DELETE /api/devices/:id
     */
    async deleteDevice(req, res) {
        try {
            const deviceId = req.params.id;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            const success = await this.deviceService.deleteDevice(deviceId, userId);
            
            if (!success) {
                return res.status(404).json({
                    success: false,
                    error: 'Device not found',
                    type: 'not_found'
                });
            }
            
            res.json({
                success: true,
                message: 'Device deleted successfully'
            });

        } catch (error) {
            const isBusinessError = error.message.includes('Cannot') || 
                                  error.message.includes('not found');

            const statusCode = isBusinessError ? 400 : 500;
            
            ModuleErrorHandler.logger.error('Delete device error:', error);
            
            res.status(statusCode).json({
                success: false,
                error: error.message || 'Failed to delete device',
                type: isBusinessError ? 'validation_error' : 'server_error'
            });
        }
    }

    /**
     * Get devices due for service
     * GET /api/devices/service/due
     */
    async getDevicesDueForService(req, res) {
        try {
            const daysAhead = parseInt(req.query.days_ahead) || 30;
            const devices = await this.deviceService.getDevicesDueForService(daysAhead);
            
            res.json({
                success: true,
                data: devices,
                parameters: {
                    days_ahead: daysAhead
                },
                count: devices.length
            });

        } catch (error) {
            const isBusinessError = error.message.includes('must be');
            const statusCode = isBusinessError ? 400 : 500;
            
            ModuleErrorHandler.logger.error('Get devices due for service error:', error);
            
            res.status(statusCode).json({
                success: false,
                error: error.message || 'Failed to fetch devices due for service',
                type: isBusinessError ? 'validation_error' : 'server_error'
            });
        }
    }

    /**
     * Get device statistics
     * GET /api/devices/statistics
     */
    async getDeviceStatistics(req, res) {
        try {
            const statistics = await this.deviceService.getDeviceStatistics();
            
            res.json({
                success: true,
                data: statistics
            });

        } catch (error) {
            ModuleErrorHandler.logger.error('Get device statistics error:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch device statistics',
                type: 'server_error'
            });
        }
    }

    /**
     * Get devices by client ID
     * GET /api/devices/client/:clientId
     */
    async getDevicesByClientId(req, res) {
        try {
            const clientId = req.params.clientId;
            const devices = await this.deviceService.getDevicesByClientId(clientId);
            
            res.json({
                success: true,
                data: devices,
                client_id: clientId,
                count: devices.length
            });

        } catch (error) {
            const isBusinessError = error.message.includes('required');
            const statusCode = isBusinessError ? 400 : 500;
            
            ModuleErrorHandler.logger.error('Get devices by client ID error:', error);
            
            res.status(statusCode).json({
                success: false,
                error: error.message || 'Failed to fetch client devices',
                type: isBusinessError ? 'validation_error' : 'server_error'
            });
        }
    }

    /**
     * Get device configuration options
     * GET /api/devices/config
     */
    async getDeviceConfig(req, res) {
        try {
            const config = {
                device_types: this.deviceService.getDeviceTypes(),
                fuel_types: this.deviceService.getFuelTypes(),
                status_options: this.deviceService.getStatusOptions(),
                brands: this.deviceService.getBrands(),
                brands_and_models: this.deviceService.getBrandsAndModels(),
                condition_ratings: [
                    { value: 1, label: '1 - Bardzo zły' },
                    { value: 2, label: '2 - Zły' },
                    { value: 3, label: '3 - Przeciętny' },
                    { value: 4, label: '4 - Dobry' },
                    { value: 5, label: '5 - Bardzo dobry' }
                ]
            };
            
            res.json({
                success: true,
                data: config
            });

        } catch (error) {
            ModuleErrorHandler.logger.error('Get device config error:', error);
            
            res.status(500).json({
                success: false,
                error: 'Failed to fetch device configuration',
                type: 'server_error'
            });
        }
    }

    /**
     * Get models for specific brand and device type
     * GET /api/devices/models?brand=xxx&device_type=yyy
     */
    async getModels(req, res) {
        try {
            const { brand, device_type } = req.query;
            
            if (!brand || !device_type) {
                return res.status(400).json({
                    success: false,
                    error: 'Brand and device_type parameters are required',
                    type: 'validation_error'
                });
            }

            const models = this.deviceService.getModels(brand, device_type);
            
            res.json({
                success: true,
                data: {
                    brand: brand,
                    device_type: device_type,
                    models: models
                }
            });

        } catch (error) {
            ModuleErrorHandler.logger.error('Get models error:', error);
            
            res.status(500).json({
                success: false,
                error: 'Failed to fetch models',
                type: 'server_error'
            });
        }
    }

    /**
     * Search devices (advanced search)
     * POST /api/devices/search
     */
    async searchDevices(req, res) {
        try {
            const searchCriteria = {
                ...req.body,
                page: parseInt(req.body.page) || 1,
                limit: parseInt(req.body.limit) || 20
            };

            const result = await this.deviceService.getDevices(searchCriteria);
            
            res.json({
                success: true,
                data: result.devices,
                pagination: result.pagination,
                search_criteria: searchCriteria
            });

        } catch (error) {
            const isBusinessError = error.message.includes('must be') || 
                                  error.message.includes('Invalid');

            const statusCode = isBusinessError ? 400 : 500;
            
            ModuleErrorHandler.logger.error('Search devices error:', error);
            
            res.status(statusCode).json({
                success: false,
                error: error.message || 'Failed to search devices',
                type: isBusinessError ? 'validation_error' : 'server_error'
            });
        }
    }

    /**
     * Batch update device statuses
     * PATCH /api/devices/batch/status
     */
    async batchUpdateStatus(req, res) {
        try {
            const { device_ids, status } = req.body;
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }

            if (!device_ids || !Array.isArray(device_ids) || device_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Device IDs array is required',
                    type: 'validation_error'
                });
            }

            if (!status) {
                return res.status(400).json({
                    success: false,
                    error: 'Status is required',
                    type: 'validation_error'
                });
            }

            const results = [];
            const errors = [];

            for (const deviceId of device_ids) {
                try {
                    const device = await this.deviceService.updateDevice(deviceId, { status }, userId);
                    if (device) {
                        results.push({ deviceId, success: true, device });
                    } else {
                        errors.push({ deviceId, error: 'Device not found' });
                    }
                } catch (error) {
                    errors.push({ deviceId, error: error.message });
                }
            }
            
            res.json({
                success: errors.length === 0,
                data: {
                    updated: results,
                    errors: errors,
                    total_requested: device_ids.length,
                    successful_updates: results.length,
                    failed_updates: errors.length
                },
                message: `${results.length} devices updated successfully`
            });

        } catch (error) {
            ModuleErrorHandler.logger.error('Batch update status error:', error);
            
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to batch update device statuses',
                type: 'server_error'
            });
        }
    }
}

module.exports = DeviceController; 