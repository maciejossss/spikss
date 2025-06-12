import axios from 'axios';
import { ModuleErrorHandler } from '../../shared/error/ModuleErrorHandler';

export class BaseAPI {
    constructor(moduleName) {
        this.moduleName = moduleName;
        this.endpoint = `/api/v1/${moduleName}`;
        this.axios = axios.create({
            baseURL: '/api/v1',
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            withCredentials: true
        });

        this.setupInterceptors();
    }

    setupInterceptors() {
        this.axios.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        this.axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (!error.response) {
                    return Promise.reject({
                        message: 'Błąd połączenia z serwerem',
                        module: this.moduleName,
                        type: 'network'
                    });
                }

                const errorResponse = {
                    status: error.response.status,
                    message: error.response.data?.message || 'Wystąpił błąd',
                    module: this.moduleName,
                    timestamp: new Date().toISOString()
                };

                if (error.response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                }

                return Promise.reject(errorResponse);
            }
        );
    }

    // Standardowe metody CRUD zgodnie z rules.txt
    async create(data) {
        try {
            const response = await this.axios.post(this.endpoint, data);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async read(id) {
        try {
            const response = await this.axios.get(`${this.endpoint}/${id}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async update(id, data) {
        try {
            const response = await this.axios.put(`${this.endpoint}/${id}`, data);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async delete(id) {
        try {
            const response = await this.axios.delete(`${this.endpoint}/${id}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async search(criteria) {
        try {
            const response = await this.axios.get(`${this.endpoint}/search`, { 
                params: criteria 
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async list(pagination = { page: 1, limit: 10 }) {
        try {
            const response = await this.axios.get(this.endpoint, { 
                params: pagination 
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    handleError(error) {
        return ModuleErrorHandler.handleError(error, this.moduleName);
    }
} 