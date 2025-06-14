const ClientDatabaseService = require('./ClientDatabaseService');
const ModuleErrorHandler = require('../../shared/error/ModuleErrorHandler');

/**
 * Client Service - Business logic layer
 * Follows RULE 4: API STANDARDIZATION from rules.txt
 */
class ClientService {
    
    constructor() {
        this.db = ClientDatabaseService;
    }
    
    /**
     * Get all clients with filtering and pagination
     * @param {Object} filters - search, type, priority filters
     * @param {Object} pagination - page, limit
     * @returns {Object} { clients: [], total: number }
     */
    async getAllClients(filters = {}, pagination = { page: 1, limit: 20 }) {
        try {
            const result = await this.db.findAll(filters, pagination);
            
            ModuleErrorHandler.logger.info(`Retrieved ${result.clients.length} clients`);
            
            return result;
            
        } catch (error) {
            ModuleErrorHandler.logger.error('Service error in getAllClients:', error);
            throw new Error(`Błąd podczas pobierania klientów: ${error.message}`);
        }
    }
    
    /**
     * Get client by ID
     * @param {string} id - Client UUID
     * @returns {Object|null} Client object or null
     */
    async getClientById(id) {
        try {
            if (!id) {
                throw new Error('ID klienta jest wymagane');
            }
            
            const client = await this.db.findById(id);
            
            if (client) {
                ModuleErrorHandler.logger.info(`Retrieved client: ${client.contact_person}`);
            }
            
            return client;
            
        } catch (error) {
            ModuleErrorHandler.logger.error(`Service error in getClientById(${id}):`, error);
            throw new Error(`Błąd podczas pobierania klienta: ${error.message}`);
        }
    }
    
    /**
     * Create new client
     * @param {Object} clientData - Client data
     * @returns {Object} Created client
     */
    async createClient(clientData) {
        try {
            // Validate required fields
            this.validateClientData(clientData);
            
            // Business logic validation
            if (clientData.nip) {
                const existingNip = await this.db.findByNip(clientData.nip);
                if (existingNip) {
                    throw new Error('Klient z tym numerem NIP już istnieje');
                }
            }

            // Check for duplicate clients based on contact person and address
            await this.checkForDuplicateClient(clientData);
            
            // Set defaults
            const processedData = {
                ...clientData,
                client_type: clientData.client_type || 'business',
                priority_level: clientData.priority_level || 'standard',
                payment_terms: clientData.payment_terms || 30,
                discount_percentage: clientData.discount_percentage || 0,
                is_active: true,
                address_country: clientData.address_country || 'Polska'
            };
            
            const result = await this.db.create(processedData);
            
            ModuleErrorHandler.logger.info(`Created client: ${result.contact_person} (ID: ${result.id})`);
            
            return result;
            
        } catch (error) {
            ModuleErrorHandler.logger.error('Service error in createClient:', error);
            throw new Error(`Błąd podczas tworzenia klienta: ${error.message}`);
        }
    }
    
    /**
     * Update client
     * @param {string} id - Client ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated client
     */
    async updateClient(id, updateData) {
        try {
            if (!id) {
                throw new Error('ID klienta jest wymagane');
            }
            
            // Check NIP uniqueness if being updated
            if (updateData.nip) {
                const existingNip = await this.db.findByNip(updateData.nip);
                if (existingNip && existingNip.id !== id) {
                    throw new Error('Klient z tym numerem NIP już istnieje');
                }
            }

            // Check for duplicate clients based on contact person and address (exclude current client)
            if (updateData.contact_person || updateData.address_street || updateData.address_city) {
                const currentClient = await this.db.findById(id);
                if (!currentClient) {
                    throw new Error('Klient nie został znaleziony');
                }
                
                const checkData = {
                    contact_person: updateData.contact_person || currentClient.contact_person,
                    address_street: updateData.address_street !== undefined ? updateData.address_street : currentClient.address_street,
                    address_city: updateData.address_city !== undefined ? updateData.address_city : currentClient.address_city
                };
                
                await this.checkForDuplicateClient(checkData, id);
            }
            
            // Remove fields that shouldn't be updated directly
            const sanitizedData = { ...updateData };
            delete sanitizedData.id;
            delete sanitizedData.created_at;
            delete sanitizedData.created_by;
            
            const result = await this.db.update(id, sanitizedData);
            
            ModuleErrorHandler.logger.info(`Updated client: ${result.contact_person} (ID: ${id})`);
            
            return result;
            
        } catch (error) {
            ModuleErrorHandler.logger.error(`Service error in updateClient(${id}):`, error);
            throw new Error(`Błąd podczas aktualizacji klienta: ${error.message}`);
        }
    }
    
    /**
     * Delete client (soft delete)
     * @param {string} id - Client ID
     * @returns {boolean} Success status
     */
    async deleteClient(id) {
        try {
            if (!id) {
                throw new Error('ID klienta jest wymagane');
            }
            
            // Soft delete - set is_active to false
            await this.db.update(id, { is_active: false });
            
            ModuleErrorHandler.logger.info(`Soft deleted client: ${id}`);
            
            return true;
            
        } catch (error) {
            ModuleErrorHandler.logger.error(`Service error in deleteClient(${id}):`, error);
            throw new Error(`Błąd podczas usuwania klienta: ${error.message}`);
        }
    }
    
    /**
     * Get client statistics
     * @returns {Object} Statistics object
     */
    async getClientStats() {
        try {
            const stats = await this.db.getStats();
            
            ModuleErrorHandler.logger.info('Retrieved client statistics');
            
            return stats;
            
        } catch (error) {
            ModuleErrorHandler.logger.error('Service error in getClientStats:', error);
            throw new Error(`Błąd podczas pobierania statystyk: ${error.message}`);
        }
    }
    
    /**
     * Search clients
     * @param {string} criteria - Search criteria
     * @returns {Array} Array of matching clients
     */
    async search(criteria) {
        try {
            if (!criteria || criteria.trim().length < 2) {
                throw new Error('Kryteria wyszukiwania muszą mieć co najmniej 2 znaki');
            }
            
            const results = await this.db.search(criteria);
            
            ModuleErrorHandler.logger.info(`Search for "${criteria}" returned ${results.length} results`);
            
            return results;
            
        } catch (error) {
            ModuleErrorHandler.logger.error('Service error in search:', error);
            throw new Error(`Błąd podczas wyszukiwania: ${error.message}`);
        }
    }
    
    /**
     * Check for duplicate clients based on contact person and address
     * @private
     * @param {Object} clientData - Client data to check
     * @param {string} excludeId - ID to exclude from search (for updates)
     */
    async checkForDuplicateClient(clientData, excludeId = null) {
        const { contact_person, address_street, address_city } = clientData;
        
        if (!contact_person || !contact_person.trim()) {
            return; // Skip check if no contact person
        }
        
        // First check: exact match on contact person + address
        if (address_street && address_city) {
            const exactDuplicate = await this.db.findDuplicateClient(
                contact_person, 
                address_street, 
                address_city, 
                excludeId
            );
            
            if (exactDuplicate) {
                let message = `Klient "${contact_person}" pod adresem "${address_street}, ${address_city}" już istnieje`;
                if (exactDuplicate.company_name) {
                    message += ` (${exactDuplicate.company_name})`;
                }
                if (exactDuplicate.phone) {
                    message += ` - tel: ${exactDuplicate.phone}`;
                }
                throw new Error(message);
            }
        }
        
        // Second check: same contact person (even without address match)
        const contactDuplicates = await this.db.findByContactPerson(contact_person, excludeId);
        
        if (contactDuplicates.length > 0) {
            // If we have address info, and found contacts with same name but different addresses
            if (address_street || address_city) {
                const matchingAddress = contactDuplicates.find(duplicate => {
                    const sameStreet = !address_street || !duplicate.address_street || 
                        address_street.toLowerCase().trim() === duplicate.address_street.toLowerCase().trim();
                    const sameCity = !address_city || !duplicate.address_city || 
                        address_city.toLowerCase().trim() === duplicate.address_city.toLowerCase().trim();
                    return sameStreet && sameCity;
                });
                
                if (matchingAddress) {
                    let message = `Klient "${contact_person}" już istnieje`;
                    if (matchingAddress.company_name) {
                        message += ` (${matchingAddress.company_name})`;
                    }
                    const duplicateAddress = [matchingAddress.address_street, matchingAddress.address_city]
                        .filter(Boolean).join(', ');
                    if (duplicateAddress) {
                        message += ` - adres: ${duplicateAddress}`;
                    }
                    if (matchingAddress.phone) {
                        message += ` - tel: ${matchingAddress.phone}`;
                    }
                    throw new Error(message);
                }
            } else {
                // No address provided, but same contact person exists
                const existing = contactDuplicates[0];
                let message = `Klient "${contact_person}" już istnieje`;
                if (existing.company_name) {
                    message += ` (${existing.company_name})`;
                }
                const existingAddress = [existing.address_street, existing.address_city]
                    .filter(Boolean).join(', ');
                if (existingAddress) {
                    message += ` - adres: ${existingAddress}`;
                }
                if (existing.phone) {
                    message += ` - tel: ${existing.phone}`;
                }
                throw new Error(message);
            }
        }
    }
    
    /**
     * Validate client data
     * @private
     * @param {Object} clientData - Data to validate
     */
    validateClientData(clientData) {
        if (!clientData.contact_person || clientData.contact_person.trim().length === 0) {
            throw new Error('Osoba kontaktowa jest wymagana');
        }
        
        if (clientData.contact_person.length > 100) {
            throw new Error('Nazwa osoby kontaktowej nie może być dłuższa niż 100 znaków');
        }
        
        if (clientData.company_name && clientData.company_name.length > 200) {
            throw new Error('Nazwa firmy nie może być dłuższa niż 200 znaków');
        }
        
        if (clientData.email && !this.isValidEmail(clientData.email)) {
            throw new Error('Nieprawidłowy format adresu email');
        }
        
        if (clientData.nip && !this.isValidNip(clientData.nip)) {
            throw new Error('Nieprawidłowy format numeru NIP');
        }
        
        if (clientData.payment_terms && (clientData.payment_terms < 0 || clientData.payment_terms > 365)) {
            throw new Error('Termin płatności musi być między 0 a 365 dni');
        }
        
        if (clientData.discount_percentage && (clientData.discount_percentage < 0 || clientData.discount_percentage > 100)) {
            throw new Error('Rabat musi być między 0% a 100%');
        }
    }
    
    /**
     * Validate email format
     * @private
     * @param {string} email
     * @returns {boolean}
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Validate NIP format (Polish tax number)
     * @private
     * @param {string} nip
     * @returns {boolean}
     */
    isValidNip(nip) {
        const nipRegex = /^\d{10}$/;
        return nipRegex.test(nip.replace(/[-\s]/g, ''));
    }
}

module.exports = new ClientService(); 