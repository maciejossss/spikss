<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authAPI } from '../modules/auth/services/AuthAPI';

export default {
    setup() {
        const username = ref('');
        const password = ref('');
        const error = ref('');
        const router = useRouter();
        const rememberMe = ref(false);

        const login = async () => {
            try {
                error.value = '';
                const response = await authAPI.login(username.value, password.value);
                if (response.success) {
                    router.push('/dashboard');
                }
            } catch (err) {
                error.value = err.message || 'Błąd logowania';
                console.error('Login error:', err);
            }
        };

        return {
            username,
            password,
            error,
            login,
            rememberMe
        };
    }
};
</script>

<template>
    <div class="login-container">
        <div class="login-box">
            <h2>Logowanie</h2>
            
            <div v-if="error" class="error-message">
                {{ error }}
            </div>

            <form @submit.prevent="login">
                <div class="form-group">
                    <label>Nazwa użytkownika</label>
                    <input 
                        v-model="username"
                        type="text"
                        required
                        autocomplete="username"
                    />
                </div>

                <div class="form-group">
                    <label>Hasło</label>
                    <input 
                        v-model="password"
                        type="password"
                        required
                        autocomplete="current-password"
                    />
                </div>

                <div class="form-group">
                    <label>
                        <input 
                            type="checkbox"
                            v-model="rememberMe"
                        />
                        Zapamiętaj mnie
                    </label>
                </div>

                <button type="submit">
                    Zaloguj się
                </button>
            </form>

            <div class="test-accounts">
                <h3>Konta testowe:</h3>
                <div class="account">
                    <strong>admin / Admin123!</strong>
                    <span>Administrator - pełny dostęp</span>
                </div>
                <div class="account">
                    <strong>technik1 / Technik123!</strong>
                    <span>Technik - serwis i urządzenia</span>
                </div>
                <div class="account">
                    <strong>kierownik / Kierownik123!</strong>
                    <span>Kierownik - zarządzanie i raporty</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #f5f5f5;
}

.login-box {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
}

input[type="text"],
input[type="password"] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
}

button {
    width: 100%;
    padding: 0.75rem;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button:hover {
    background: #357abd;
}

.error-message {
    color: #dc3545;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: #f8d7da;
    border-radius: 4px;
}

.test-accounts {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #eee;
}

.account {
    margin: 0.5rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
}

.account span {
    color: #666;
}
</style> 