import { BaseAPI } from '../../../shared/api/BaseAPI';

export class ClientAPI extends BaseAPI {
    constructor() {
        super('clients');
    }

    // Rozszerzenie standardowych metod CRUD o specyficzne dla klientów
    async getClientDevices(clientId) {
        try {
            const response = await this.axios.get(`${this.endpoint}/${clientId}/devices`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getClientServiceHistory(clientId) {
        try {
            const response = await this.axios.get(`${this.endpoint}/${clientId}/service-history`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async updateClientContact(clientId, contactData) {
        try {
            const response = await this.axios.put(`${this.endpoint}/${clientId}/contact`, contactData);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async searchByLocation(location) {
        try {
            const response = await this.search({ location });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getActiveClients() {
        try {
            const response = await this.search({ status: 'active' });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // Walidacja danych klienta przed wysłaniem
    validateClientData(clientData) {
        const errors = [];

        if (!clientData.name) {
            errors.push('Nazwa klienta jest wymagana');
        }

        if (!clientData.email && !clientData.phone) {
            errors.push('Wymagany jest email lub numer telefonu');
        }

        if (clientData.email && !this.isValidEmail(clientData.email)) {
            errors.push('Nieprawidłowy format adresu email');
        }

        if (errors.length > 0) {
            throw {
                type: 'validation',
                message: errors.join(', ')
            };
        }
    }

    // Metody pomocnicze
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}

// Eksportuj pojedynczą instancję
export const clientAPI = new ClientAPI(); 