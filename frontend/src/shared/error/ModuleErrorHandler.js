// Stałe dla typów błędów
const ErrorTypes = {
    NETWORK: 'network',
    DATABASE: 'database',
    VALIDATION: 'validation',
    AUTHORIZATION: 'authorization',
    NOT_FOUND: 'not_found',
    SYSTEM: 'system'
};

export class ModuleErrorHandler {
    static errorLog = [];
    static maxLogSize = 100;

    static handleError(error, moduleName) {
        const timestamp = new Date().toISOString();
        
        // 1. Przygotuj szczegółowy obiekt błędu
        const errorDetails = {
            success: false,
            module: moduleName,
            type: this.determineErrorType(error),
            message: this.getErrorMessage(error),
            originalError: error,
            timestamp
        };

        // 2. Log do konsoli z pełnymi szczegółami
        console.error(`ERROR in ${moduleName} [${errorDetails.type}]:`, {
            message: errorDetails.message,
            details: error,
            timestamp
        });

        // 3. Zachowaj w lokalnym logu
        this.logError(errorDetails);

        // 4. Wyślij do systemu monitoringu jeśli jest produkcja
        if (process.env.NODE_ENV === 'production') {
            this.sendToMonitoring(errorDetails);
        }

        // 5. Zwróć użytkownikowi przyjazny komunikat
        return {
            success: false,
            module: moduleName,
            message: this.getUserFriendlyMessage(errorDetails),
            type: errorDetails.type,
            timestamp
        };
    }

    static determineErrorType(error) {
        if (!error.response) return ErrorTypes.NETWORK;
        
        switch (error.response?.status) {
            case 401: return ErrorTypes.AUTHORIZATION;
            case 404: return ErrorTypes.NOT_FOUND;
            case 422: return ErrorTypes.VALIDATION;
            case 500: return ErrorTypes.DATABASE;
            default: return ErrorTypes.SYSTEM;
        }
    }

    static getErrorMessage(error) {
        if (error.response?.data?.message) {
            return error.response.data.message;
        }
        if (error.message) {
            return error.message;
        }
        return 'Wystąpił nieznany błąd';
    }

    static getUserFriendlyMessage(errorDetails) {
        switch (errorDetails.type) {
            case ErrorTypes.NETWORK:
                return 'Problem z połączeniem sieciowym. Sprawdź swoje połączenie i spróbuj ponownie.';
            case ErrorTypes.DATABASE:
                return 'Wystąpił problem z bazą danych. Spróbuj ponownie za chwilę.';
            case ErrorTypes.VALIDATION:
                return 'Nieprawidłowe dane. Sprawdź wprowadzone informacje.';
            case ErrorTypes.AUTHORIZATION:
                return 'Brak uprawnień lub sesja wygasła. Zaloguj się ponownie.';
            case ErrorTypes.NOT_FOUND:
                return 'Nie znaleziono żądanego zasobu.';
            default:
                return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.';
        }
    }

    static logError(errorDetails) {
        this.errorLog.unshift(errorDetails);
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.pop();
        }
    }

    static async sendToMonitoring(errorDetails) {
        try {
            // Tu możemy dodać integrację z systemem monitoringu
            // np. Sentry, LogRocket, itp.
            console.log('Sending to monitoring:', errorDetails);
        } catch (error) {
            console.error('Failed to send error to monitoring:', error);
        }
    }

    static getErrorLog() {
        return this.errorLog;
    }

    static clearErrorLog() {
        this.errorLog = [];
    }
} 