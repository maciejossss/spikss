/**
 * RULE 2: BUSINESS LOGIC SEPARATION
 * Device Service for System Serwisowy Palniki & Kotły
 * Handles business logic for devices module
 */

const DeviceDatabaseService = require('./DeviceDatabaseService');
const ModuleErrorHandler = require('../../shared/error/ModuleErrorHandler');

class DeviceService {
    constructor() {
        this.deviceDatabase = new DeviceDatabaseService();
        
        // Device types with validation
        this.deviceTypes = [
            'burner', 'boiler', 'controller', 'pump', 'valve', 'sensor', 
            'heat_exchanger', 'chimney', 'expansion_tank', 'safety_valve',
            'thermostatic_valve', 'circulation_pump', 'mixing_valve', 'water_heater', 'water_heater_flow'
        ];

        // Fuel types
        this.fuelTypes = [
            'natural_gas', 'lpg', 'oil', 'biomass', 'coal', 'electric',
            'solar', 'heat_pump', 'mixed'
        ];

        // Device statuses
        this.deviceStatuses = ['active', 'inactive', 'decommissioned'];

        // Brands and models configuration
        this.brandsAndModels = {
            'Viessmann': {
                'boiler': {
                    'Kotły gazowe kondensacyjne': [
                        'Vitodens 050-W', 'Vitodens 100-W', 'Vitodens 111-W', 
                        'Vitodens 200-W', 'Vitodens 222-F'
                    ],
                    'Kotły gazowe atmosferyczne i stare modele': [
                        'Vitopend 100', 'Vitopend 200', 'Vitogas 100', 'Vitogas 200'
                    ],
                    'Kotły olejowe i niskotemperaturowe': [
                        'Vitorond 100', 'Vitorond 200', 'Vitola-biferral', 
                        'Vitola 100', 'Vitola 200', 'Vitoladens 300-C'
                    ]
                },
                'pump': {
                    'Pompy ciepła': [
                        'Vitocal 250-A', 'Vitocal 200-S', 'Vitocal 300-G'
                    ]
                },
                'burner': {
                    'Podgrzewacze przepływowe elektryczne': [
                        'Vitotherm EI5', 'Vitotherm EI6'
                    ]
                },
                'water_heater': {
                    'Podgrzewacze przepływowe elektryczne': [
                        'Vitotherm EI5', 'Vitotherm EI6'
                    ],
                    'Podgrzewacze pojemnościowe': [
                        'Vitocell 100-W', 'Vitocell 100-V', 'Vitocell 300-V', 'Vitocell 300-H'
                    ]
                },
                'water_heater_flow': {
                    'Elektryczne przepływowe': [
                        'Vitotherm EI4', 'Vitotherm EI5', 'Vitotherm EI6'
                    ]
                },
                'heat_exchanger': {
                    'Kolektory słoneczne': [
                        'Vitosol 100-F', 'Vitosol 200-F', 'Vitosol 300-T'
                    ],
                    'Podgrzewacze pojemnościowe z wymiennikiem': [
                        'Vitocell 100-W', 'Vitocell 100-V', 'Vitocell 300-V', 'Vitocell 300-H'
                    ]
                }
            },
            'Junkers/Bosch': {
                'boiler': {
                    'Kotły gazowe': [
                        'Cerapur Smart', 'Cerapur Compact', 'Cerapur Modul', 
                        'Ceraclass', 'Cerastar', 'GC2200W', 'GB172i'
                    ],
                    'Starsze kotły': [
                        'ZWR 24-3 KE', 'ZSR', 'Ceraclass ZWR 18-2 G/K', 'U042', 'U052'
                    ]
                },
                'burner': {
                    'Podgrzewacze przepływowe gazowe': [
                        'Hydro 4200 WR 9-4 KB', 'WRD 10-4 KB', 'WP 11 B', 
                        'WRP 250-5 KB', 'WRDP 11-2B', 'WP10 B'
                    ]
                },
                'water_heater': {
                    'Podgrzewacze przepływowe gazowe': [
                        'Hydro 4200 WR 9-4 KB', 'WRD 10-4 KB', 'WP 11 B', 
                        'WRP 250-5 KB', 'WRDP 11-2B', 'WP10 B'
                    ]
                },
                'water_heater_flow': {
                    'Gazowe przepływowe': [
                        'Hydro 4200 WRD 9-4 KB', 'Hydro 4300 WRD 14-4 KG', 'WRP 11 B', 
                        'WRDP 11-2B', 'WP 11 B'
                    ]
                },
                'heat_exchanger': {
                    'Podgrzewacze pojemnościowe z wymiennikiem': [
                        'Vitocell 100-W', 'Vitocell 100-V', 'Vitocell 300-V', 'Vitocell 300-H'
                    ]
                },
                'controller': {
                    'Sterowniki': [
                        'CW100', 'CW400', 'CW800'
                    ]
                }
            },
            'De Dietrich': {
                'boiler': {
                    'Kotły gazowe kondensacyjne': [
                        'MCR3 evo', 'Modulens AGC', 'Modulens BIC', 'Evodens AMC', 
                        'Inidens', 'City Condens', 'DTG'
                    ],
                    'Kotły żeliwne gazowe/olejowe': [
                        'GT 120', 'GT 210', 'GT 330'
                    ]
                },
                'pump': {
                    'Pompy ciepła': [
                        'Alezio S', 'Alezio M'
                    ]
                },
                'water_heater_flow': {
                    'Przepływowe podgrzewacze': [
                        'KWDietrich 58860003'
                    ]
                },
                'heat_exchanger': {
                    'Podgrzewacze c.w.u.': [
                        'SR 150 MG', 'SR 150 W', 'SW100', 'Elensio 250H', 'Zena MS 24 MI'
                    ]
                }
            },
            'Brötje': {
                'boiler': {
                    'Kotły gazowe kondensacyjne': [
                        'WGB 14.1', 'WGB 18.1', 'WGB 22.1', 'WGB 28.1', 'WGB 38.1',
                        'WBS 22.1', 'WBS 28.1', 'WBC 22.1', 'WBC 28.1',
                        'BBK EVO', 'BBS EVO'
                    ],
                    'Starsze modele': [
                        'CE24EGN', 'EcoTherm Kompakt WKS', 'EcoTherm Kompakt WKC', 
                        'SGB', 'EBC'
                    ]
                },
                'pump': {
                    'Pompy ciepła': [
                        'BLW Split C', 'BLW Split K', 'BLW Split P'
                    ]
                },
                'water_heater_flow': {
                    'Kotły z funkcją przepływową': [
                        'QWHC 20/24', 'WBC', 'PWHC'
                    ]
                },
                'heat_exchanger': {
                    'Podgrzewacze c.w.u.': [
                        'Kompaktowe', 'Wolnostojące'
                    ]
                }
            },
            'Buderus': {
                'boiler': {
                    'Kotły gazowe kondensacyjne': [
                        'GB172i.2', 'GB192i', 'GB162', 'GB062V2', 'GB022-20K'
                    ],
                    'Starsze kotły gazowe': [
                        'GB112', 'U104', 'U112', 'U122'
                    ],
                    'Kotły olejowe i żeliwne': [
                        'Logano G124', 'Logano G134', 'Logano G234'
                    ]
                },
                'pump': {
                    'Pompy ciepła': [
                        'Logatherm WPL', 'Logatherm WPS'
                    ]
                },
                'water_heater_flow': {
                    'Gazowe przepływowe': [
                        'Logamax plus DB213'
                    ],
                    'Kotły z funkcją przepływową': [
                        'Logamax plus GB122iK'
                    ]
                },
                'heat_exchanger': {
                    'Podgrzewacze c.w.u.': [
                        'Logalux SU', 'Logalux ESU', 'Logalux LT-135/1'
                    ]
                }
            },
            'Ferroli': {
                'boiler': {
                    'Kotły gazowe kondensacyjne': [
                        'Bluehelix RRT'
                    ],
                    'Starsze kotły gazowe': [
                        'DIVA', 'DIVATOP HC', 'Domina F24', 'Domina F30', 'Pegaso D'
                    ]
                },
                'pump': {
                    'Pompy ciepła': [
                        'Omnia M', 'Omnia S', 'Omnia ST', 'Omnia HY'
                    ]
                },
                'burner': {
                    'Podgrzewacze przepływowe gazowe': [
                        'Zefiro C11', 'Pegaso Eco 11'
                    ]
                },
                'water_heater': {
                    'Podgrzewacze przepływowe gazowe': [
                        'Zefiro C11', 'Pegaso Eco 11'
                    ],
                    'Podgrzewacze pojemnościowe': [
                        'CUBO SG 10', 'CUBO SG 15', 'Tnd Plus 100', 'Titanium', 'Ecotop'
                    ]
                },
                'water_heater_flow': {
                    'Gazowe przepływowe': [
                        'Zefiro C11', 'Pegaso Eco 11', 'Pegaso Pro 11 NG GZ50'
                    ],
                    'Starsze modele gazowe': [
                        'CIP-7', 'CIP-11', 'CIP-13', 'CIC-13'
                    ]
                },
                'heat_exchanger': {
                    'Podgrzewacze pojemnościowe z wymiennikiem': [
                        'CUBO SG 10', 'CUBO SG 15', 'Tnd Plus 100', 'Titanium', 'Ecotop'
                    ]
                }
            },
            'Weishaupt': {
                'boiler': {
                    'Kotły gazowe kondensacyjne': [
                        'Thermo Condens WTC-GW', 'Thermo Condens GB', 'Thermo Condens S'
                    ],
                    'Starsze kotły i podgrzewacze': [
                        'WL10', 'WL20', 'WL30', 'Thermo Unit', 'Thermo Kompakt', 'WH'
                    ]
                },
                'heat_exchanger': {
                    'Podgrzewacze c.w.u.': [
                        'WAS 150', 'WAS 200', 'WAS 280', 'WAS 400', 'WL5'
                    ]
                }
            },
            'Giersch': {
                'burner': {
                    'Palniki gazowe i olejowe': [
                        'R1', 'R20', 'R40', 'R1.1', 'R2.1', 'R3.2', 'R5'
                    ]
                },
                'boiler': {
                    'Kotły kondensacyjne': [
                        'Giersch R1'
                    ],
                    'Kotły starsze': [
                        'GK1', 'GK2'
                    ]
                },
                'pump': {
                    'Pompy ciepła': [
                        'Modele powietrzne', 'Modele gruntowe'
                    ]
                }
            },
            'Riello': {
                'burner': {
                    'Seria Gulliver RG/RGD/RGO/RGS': [
                        'RG0', 'RG1', 'RG2', 'RG3', 'RG4', 'RG5', 'RG5S', 'RGO', 'RGS',
                        'RGD 322 KB', 'RG5D'
                    ],
                    'Seria RL dwustopniowe': [
                        'RL28', 'RL38', 'RL50', 'RL70', 'RL100', 'RL130', 'RL190', 'RL250'
                    ],
                    'Seria RL modulowane': [
                        'RL28-50/M', 'RL70-190/M', 'RL190M', 'RL250M'
                    ],
                    'Seria RL elektroniczne': [
                        'RL28-50/E', 'RL70-190/E'
                    ],
                    'Seria RL mikroprocesorowe': [
                        'RL28-50_RMO', 'RL70-130_RMO', 'RL190_RMO', 'RL250_RMO'
                    ],
                    'Seria PRESS': [
                        'PRESS G', 'PRESS GV', 'PRESS N', 'PRESS T/N'
                    ],
                    'Seria 40': [
                        '40 G', '40 F3', '40 F5'
                    ],
                    'Seria RDB': [
                        'RDB1', 'RDB2', 'RDB3'
                    ],
                    'Seria RS dwustopniowe': [
                        'RS28', 'RS38', 'RS50', 'RS70', 'RS100', 'RS130', 'RS190'
                    ],
                    'Seria RS modulowane mechanicznie': [
                        'RS28-50/M', 'RS70-190/M'
                    ],
                    'Seria RS modulowane elektronicznie': [
                        'RS28-50/E', 'RS70-190/E'
                    ],
                    'Seria RLS gazowo-olejowe dwustopniowe': [
                        'RLS28', 'RLS38', 'RLS50', 'RLS70', 'RLS100', 'RLS130'
                    ],
                    'Seria RLS gazowo-olejowe modulowane mechanicznie': [
                        'RLS68-120/M MX', 'RLS160/M MX', 'RLS190/M', 'RLS250/M'
                    ],
                    'Seria RLS gazowo-olejowe modulowane elektronicznie': [
                        'RLS68-200/E MX', 'RLS310-610/E MX', 'RLS1000-1200/E MX'
                    ]
                }
            }
        };
    }

    /**
     * Create new device with validation
     * @param {Object} deviceData - Device data
     * @param {string} userId - User ID creating the device
     * @returns {Object} Created device
     */
    async createDevice(deviceData, userId) {
        try {
            // Validate required fields
            await this.validateDeviceData(deviceData);

            // Check for duplicate serial number if provided
            if (deviceData.serial_number) {
                await this.checkForDuplicateSerial(deviceData.serial_number);
            }

            // Set created_by
            deviceData.created_by = userId;

            // Calculate next service date if not provided
            if (deviceData.installation_date && !deviceData.next_service_date) {
                deviceData.next_service_date = this.calculateNextServiceDate(
                    deviceData.installation_date, 
                    deviceData.maintenance_interval_days || 365
                );
            }

            // Validate power rating
            if (deviceData.power_rating) {
                this.validatePowerRating(deviceData.power_rating);
            }

            // Validate condition rating
            if (deviceData.condition_rating) {
                this.validateConditionRating(deviceData.condition_rating);
            }

            const device = await this.deviceDatabase.createDevice(deviceData);
            
            ModuleErrorHandler.logger.info(`Device created: ${device.id} - ${device.brand} ${device.model}`);
            return device;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'createDevice' });
            throw error;
        }
    }

    /**
     * Get devices with filters and pagination
     * @param {Object} options - Query options
     * @returns {Object} Devices list with pagination
     */
    async getDevices(options = {}) {
        try {
            // Validate pagination parameters
            if (options.page && options.page < 1) {
                throw new Error('Page number must be greater than 0');
            }
            
            if (options.limit && (options.limit < 1 || options.limit > 100)) {
                throw new Error('Limit must be between 1 and 100');
            }

            // Validate filters
            if (options.device_type && !this.deviceTypes.includes(options.device_type)) {
                throw new Error(`Invalid device type: ${options.device_type}`);
            }

            if (options.status && !this.deviceStatuses.includes(options.status)) {
                throw new Error(`Invalid status: ${options.status}`);
            }

            const result = await this.deviceDatabase.getDevices(options);
            
            // Add business logic enrichment
            result.devices = result.devices.map(device => this.enrichDeviceData(device));
            
            return result;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'getDevices' });
            throw error;
        }
    }

    /**
     * Get device by ID
     * @param {string} deviceId - Device ID
     * @returns {Object|null} Device data
     */
    async getDeviceById(deviceId) {
        try {
            if (!deviceId) {
                throw new Error('Device ID is required');
            }

            const device = await this.deviceDatabase.getDeviceById(deviceId);
            
            if (!device) {
                return null;
            }

            return this.enrichDeviceData(device);

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'getDeviceById' });
            throw error;
        }
    }

    /**
     * Update device with validation
     * @param {string} deviceId - Device ID
     * @param {Object} updateData - Update data
     * @param {string} userId - User ID performing update
     * @returns {Object|null} Updated device
     */
    async updateDevice(deviceId, updateData, userId) {
        try {
            if (!deviceId) {
                throw new Error('Device ID is required');
            }

            // Validate update data
            await this.validateDeviceUpdateData(updateData);

            // Check for duplicate serial number if updating
            if (updateData.serial_number) {
                await this.checkForDuplicateSerial(updateData.serial_number, deviceId);
            }

            // Validate power rating
            if (updateData.power_rating) {
                this.validatePowerRating(updateData.power_rating);
            }

            // Validate condition rating
            if (updateData.condition_rating) {
                this.validateConditionRating(updateData.condition_rating);
            }

            // Recalculate next service date if relevant fields changed
            if (updateData.last_service_date || updateData.maintenance_interval_days) {
                const currentDevice = await this.deviceDatabase.getDeviceById(deviceId);
                if (currentDevice) {
                    const serviceDate = updateData.last_service_date || currentDevice.last_service_date;
                    const interval = updateData.maintenance_interval_days || currentDevice.maintenance_interval_days;
                    
                    if (serviceDate && interval) {
                        updateData.next_service_date = this.calculateNextServiceDate(serviceDate, interval);
                    }
                }
            }

            const device = await this.deviceDatabase.updateDevice(deviceId, updateData);
            
            if (!device) {
                return null;
            }

            ModuleErrorHandler.logger.info(`Device updated: ${device.id} by user ${userId}`);
            return this.enrichDeviceData(device);

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'updateDevice' });
            throw error;
        }
    }

    /**
     * Delete device with business logic checks
     * @param {string} deviceId - Device ID
     * @param {string} userId - User ID performing deletion
     * @returns {boolean} Success status
     */
    async deleteDevice(deviceId, userId) {
        try {
            if (!deviceId) {
                throw new Error('Device ID is required');
            }

            // Check if device exists
            const device = await this.deviceDatabase.getDeviceById(deviceId);
            if (!device) {
                throw new Error('Device not found');
            }

            // Business rule: Only allow deletion of inactive or decommissioned devices
            if (device.status === 'active') {
                throw new Error('Cannot delete active device. Please deactivate first.');
            }

            const success = await this.deviceDatabase.deleteDevice(deviceId);
            
            if (success) {
                ModuleErrorHandler.logger.info(`Device deleted: ${deviceId} by user ${userId}`);
            }
            
            return success;

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'deleteDevice' });
            throw error;
        }
    }

    /**
     * Get devices due for service
     * @param {number} daysAhead - Days ahead to check
     * @returns {Array} Devices due for service
     */
    async getDevicesDueForService(daysAhead = 30) {
        try {
            if (daysAhead < 0 || daysAhead > 365) {
                throw new Error('Days ahead must be between 0 and 365');
            }

            const devices = await this.deviceDatabase.getDevicesDueForService(daysAhead);
            
            return devices.map(device => ({
                ...this.enrichDeviceData(device),
                urgency: this.calculateServiceUrgency(device.days_overdue)
            }));

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'getDevicesDueForService' });
            throw error;
        }
    }

    /**
     * Get device statistics
     * @returns {Object} Device statistics
     */
    async getDeviceStatistics() {
        try {
            const stats = await this.deviceDatabase.getDeviceStatistics();
            
            // Add calculated percentages
            const total = parseInt(stats.total_devices);
            
            return {
                ...stats,
                total_devices: total,
                active_devices: parseInt(stats.active_devices),
                inactive_devices: parseInt(stats.inactive_devices),
                decommissioned_devices: parseInt(stats.decommissioned_devices),
                overdue_services: parseInt(stats.overdue_services),
                upcoming_services: parseInt(stats.upcoming_services),
                device_types_count: parseInt(stats.device_types_count),
                brands_count: parseInt(stats.brands_count),
                // Percentages
                active_percentage: total > 0 ? Math.round((stats.active_devices / total) * 100) : 0,
                overdue_percentage: total > 0 ? Math.round((stats.overdue_services / total) * 100) : 0
            };

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'getDeviceStatistics' });
            throw error;
        }
    }

    /**
     * Get devices by client ID
     * @param {string} clientId - Client ID
     * @returns {Array} Client devices
     */
    async getDevicesByClientId(clientId) {
        try {
            if (!clientId) {
                throw new Error('Client ID is required');
            }

            const devices = await this.deviceDatabase.getDevicesByClientId(clientId);
            return devices.map(device => this.enrichDeviceData(device));

        } catch (error) {
            ModuleErrorHandler.handleError(error, 'devices', { operation: 'getDevicesByClientId' });
            throw error;
        }
    }

    /**
     * Get device type options
     * @returns {Array} Device types
     */
    getDeviceTypes() {
        return this.deviceTypes.map(type => ({
            value: type,
            label: this.formatDeviceTypeLabel(type)
        }));
    }

    /**
     * Get fuel type options
     * @returns {Array} Fuel types
     */
    getFuelTypes() {
        return this.fuelTypes.map(type => ({
            value: type,
            label: this.formatFuelTypeLabel(type)
        }));
    }

    /**
     * Get status options
     * @returns {Array} Status options
     */
    getStatusOptions() {
        return this.deviceStatuses.map(status => ({
            value: status,
            label: this.formatStatusLabel(status)
        }));
    }

    /**
     * Get available brands
     * @returns {Array} Available brands
     */
    getBrands() {
        return Object.keys(this.brandsAndModels).map(brand => ({
            value: brand,
            label: brand
        }));
    }

    /**
     * Get models for specific brand and device type
     * @param {string} brand - Brand name
     * @param {string} deviceType - Device type
     * @returns {Array} Available models grouped by category
     */
    getModels(brand, deviceType) {
        if (!brand || !deviceType) {
            return [];
        }

        const brandConfig = this.brandsAndModels[brand];
        if (!brandConfig) {
            return [];
        }

        const deviceTypeConfig = brandConfig[deviceType];
        if (!deviceTypeConfig) {
            return [];
        }

        // Return models grouped by category
        return Object.entries(deviceTypeConfig).map(([category, models]) => ({
            category: category,
            models: models.map(model => ({
                value: model,
                label: model
            }))
        }));
    }

    /**
     * Get flat list of models for specific brand and device type
     * @param {string} brand - Brand name  
     * @param {string} deviceType - Device type
     * @returns {Array} Flat array of models
     */
    getModelsList(brand, deviceType) {
        const groupedModels = this.getModels(brand, deviceType);
        const flatModels = [];
        
        groupedModels.forEach(group => {
            flatModels.push(...group.models);
        });
        
        return flatModels;
    }

    /**
     * Get complete brands and models configuration
     * @returns {Object} Complete configuration
     */
    getBrandsAndModels() {
        return this.brandsAndModels;
    }

    // Private validation methods
    
    /**
     * Validate device data
     * @private
     */
    async validateDeviceData(deviceData) {
        if (!deviceData.client_id) {
            throw new Error('Client ID is required');
        }

        if (!deviceData.device_type) {
            throw new Error('Device type is required');
        }

        if (!this.deviceTypes.includes(deviceData.device_type)) {
            throw new Error(`Invalid device type: ${deviceData.device_type}`);
        }

        if (deviceData.fuel_type && !this.fuelTypes.includes(deviceData.fuel_type)) {
            throw new Error(`Invalid fuel type: ${deviceData.fuel_type}`);
        }

        if (deviceData.status && !this.deviceStatuses.includes(deviceData.status)) {
            throw new Error(`Invalid status: ${deviceData.status}`);
        }

        if (deviceData.manufacture_year) {
            const currentYear = new Date().getFullYear();
            if (deviceData.manufacture_year < 1950 || deviceData.manufacture_year > currentYear) {
                throw new Error(`Invalid manufacture year: ${deviceData.manufacture_year}`);
            }
        }
    }

    /**
     * Validate device update data
     * @private
     */
    async validateDeviceUpdateData(updateData) {
        if (updateData.device_type && !this.deviceTypes.includes(updateData.device_type)) {
            throw new Error(`Invalid device type: ${updateData.device_type}`);
        }

        if (updateData.fuel_type && !this.fuelTypes.includes(updateData.fuel_type)) {
            throw new Error(`Invalid fuel type: ${updateData.fuel_type}`);
        }

        if (updateData.status && !this.deviceStatuses.includes(updateData.status)) {
            throw new Error(`Invalid status: ${updateData.status}`);
        }

        if (updateData.manufacture_year) {
            const currentYear = new Date().getFullYear();
            if (updateData.manufacture_year < 1950 || updateData.manufacture_year > currentYear) {
                throw new Error(`Invalid manufacture year: ${updateData.manufacture_year}`);
            }
        }
    }

    /**
     * Check for duplicate serial number
     * @private
     */
    async checkForDuplicateSerial(serialNumber, excludeId = null) {
        if (!serialNumber || serialNumber.trim() === '') {
            return; // Empty serial numbers are allowed
        }

        const existingDevice = await this.deviceDatabase.findBySerialNumber(serialNumber, excludeId);
        
        if (existingDevice) {
            throw new Error(
                `Device with serial number '${serialNumber}' already exists ` +
                `(${existingDevice.brand} ${existingDevice.model} - ${existingDevice.company_name})`
            );
        }
    }

    /**
     * Validate power rating
     * @private
     */
    validatePowerRating(powerRating) {
        if (powerRating <= 0 || powerRating > 10000) {
            throw new Error('Power rating must be between 0 and 10,000 kW');
        }
    }

    /**
     * Validate condition rating
     * @private
     */
    validateConditionRating(conditionRating) {
        if (conditionRating < 1 || conditionRating > 5) {
            throw new Error('Condition rating must be between 1 and 5');
        }
    }

    /**
     * Calculate next service date
     * @private
     */
    calculateNextServiceDate(lastServiceDate, intervalDays) {
        const date = new Date(lastServiceDate);
        date.setDate(date.getDate() + intervalDays);
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }

    /**
     * Calculate service urgency
     * @private
     */
    calculateServiceUrgency(daysOverdue) {
        if (daysOverdue > 30) return 'critical';
        if (daysOverdue > 14) return 'high';
        if (daysOverdue > 0) return 'medium';
        return 'low';
    }

    /**
     * Enrich device data with business logic
     * @private
     */
    enrichDeviceData(device) {
        return {
            ...device,
            device_type_label: this.formatDeviceTypeLabel(device.device_type),
            fuel_type_label: device.fuel_type ? this.formatFuelTypeLabel(device.fuel_type) : null,
            status_label: this.formatStatusLabel(device.status),
            warranty_status: this.getWarrantyStatus(device.warranty_expiry_date),
            service_status: this.getServiceStatus(device.next_service_date),
            age_years: device.manufacture_year ? new Date().getFullYear() - device.manufacture_year : null
        };
    }

    /**
     * Format device type label
     * @private
     */
    formatDeviceTypeLabel(type) {
        const labels = {
            'burner': 'Palnik',
            'boiler': 'Kocioł',
            'controller': 'Sterownik',
            'pump': 'Pompa',
            'valve': 'Zawór',
            'sensor': 'Czujnik',
            'heat_exchanger': 'Wymiennik ciepła',
            'chimney': 'Komin',
            'expansion_tank': 'Naczynie wzbiorcze',
            'safety_valve': 'Zawór bezpieczeństwa',
            'thermostatic_valve': 'Zawór termostatyczny',
            'circulation_pump': 'Pompa cyrkulacyjna',
            'mixing_valve': 'Zawór mieszający',
            'water_heater': 'Bojler',
            'water_heater_flow': 'Bojler przepływowy'
        };
        return labels[type] || type;
    }

    /**
     * Format fuel type label
     * @private
     */
    formatFuelTypeLabel(type) {
        const labels = {
            'natural_gas': 'Gaz ziemny',
            'lpg': 'LPG',
            'oil': 'Olej',
            'biomass': 'Biomasa',
            'coal': 'Węgiel',
            'electric': 'Elektryczny',
            'solar': 'Solarny',
            'heat_pump': 'Pompa ciepła',
            'mixed': 'Mieszane'
        };
        return labels[type] || type;
    }

    /**
     * Format status label
     * @private
     */
    formatStatusLabel(status) {
        const labels = {
            'active': 'Aktywny',
            'inactive': 'Nieaktywny',
            'decommissioned': 'Wycofany'
        };
        return labels[status] || status;
    }

    /**
     * Get warranty status
     * @private
     */
    getWarrantyStatus(warrantyExpiry) {
        if (!warrantyExpiry) return 'unknown';
        
        const today = new Date();
        const expiry = new Date(warrantyExpiry);
        
        if (expiry < today) return 'expired';
        
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30) return 'expiring_soon';
        
        return 'valid';
    }

    /**
     * Get service status
     * @private
     */
    getServiceStatus(nextServiceDue) {
        if (!nextServiceDue) return 'unknown';
        
        const today = new Date();
        const serviceDate = new Date(nextServiceDue);
        
        if (serviceDate < today) return 'overdue';
        
        const daysUntilService = Math.ceil((serviceDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntilService <= 14) return 'due_soon';
        
        return 'scheduled';
    }
}

module.exports = DeviceService; 