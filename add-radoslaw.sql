-- Dodanie Radosława CICHOREK do lokalnej bazy danych
INSERT INTO users (id, username, full_name, role, email, is_active, created_at, updated_at) 
VALUES (7, 'radek', 'Radosław CICHOREK', 'technician', 'radek@serwis.pl', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP); 