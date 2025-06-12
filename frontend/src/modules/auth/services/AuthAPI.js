import { BaseAPI } from '../../../shared/api/BaseAPI';

export class AuthAPI extends BaseAPI {
    constructor() {
        super('auth');
    }

    async login(username, password) {
        try {
            const response = await this.axios.post('/auth/login', {
                username,
                password
            });
            
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }
            
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async logout() {
        try {
            await this.axios.post('/auth/logout');
            localStorage.removeItem('token');
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async checkAuth() {
        try {
            const response = await this.axios.get('/auth/check');
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }
}

export const authAPI = new AuthAPI(); 