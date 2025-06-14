-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(200),
    contact_person VARCHAR(100) NOT NULL,
    nip VARCHAR(20),
    regon VARCHAR(20),
    address_street VARCHAR(200),
    address_city VARCHAR(100),
    address_postal_code VARCHAR(20),
    address_country VARCHAR(100) DEFAULT 'Polska',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    client_type VARCHAR(20) DEFAULT 'business',
    priority_level VARCHAR(20) DEFAULT 'standard',
    payment_terms INTEGER DEFAULT 30,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;

-- Create trigger
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_contact_person ON clients(contact_person);
CREATE INDEX IF NOT EXISTS idx_clients_nip ON clients(nip);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_client_type ON clients(client_type);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active); 