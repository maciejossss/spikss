-- Tabela users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dodaj podstawowych użytkowników jeśli nie istnieją
INSERT INTO users (username, password_hash, email, role, permissions)
SELECT 'admin', '$2b$10$rMbxvXYrCWqGw.PFZsqzaO5tXQxBE8wGUYRih9mL4kN4t/ikF3Tq.', 'admin@example.com', 'admin', '{"*": ["*"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

INSERT INTO users (username, password_hash, email, role, permissions)
SELECT 'technik1', '$2b$10$rMbxvXYrCWqGw.PFZsqzaO5tXQxBE8wGUYRih9mL4kN4t/ikF3Tq.', 'technik1@example.com', 'technician', '{"devices": ["read", "write", "manage"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'technik1');

INSERT INTO users (username, password_hash, email, role, permissions)
SELECT 'kierownik', '$2b$10$rMbxvXYrCWqGw.PFZsqzaO5tXQxBE8wGUYRih9mL4kN4t/ikF3Tq.', 'kierownik@example.com', 'manager', '{"reports": ["read", "write", "manage"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'kierownik'); 