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

    // ... reszta implementacji BaseAPI ...
} 