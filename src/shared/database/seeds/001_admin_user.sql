-- Insert admin user with hashed password (Admin123!)
INSERT OR IGNORE INTO users (
    username,
    password_hash,
    email,
    role,
    permissions
)
VALUES (
    'admin',
    '$2b$10$cYjZPyB.Aqaw4.XvpcaTm.kxwOhaZ1IP46rjT5kcKO1z9LrFdCOyu',
    'admin@system.local',
    'admin',
    '{"clients": ["read", "write", "delete"], "devices": ["read", "write", "delete"], "service": ["read", "write", "delete"], "system": ["read", "write", "delete"], "users": ["read", "write", "delete"]}'
); 