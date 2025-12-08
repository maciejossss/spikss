const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { app } = require('electron');

const SHOULD_SEED_DEFAULT_SPARE_PARTS = process.env.SEED_DEFAULT_SPARE_PARTS === '1';
const SHOULD_SEED_SAMPLE_DATA = process.env.SEED_SAMPLE_DATA === '1';

const DEFAULT_SPARE_PARTS = [
  { name: 'Czujnik płomienia – flame rod', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'FLM-ROD-001', manufacturer: 'Universal', brand: 'Universal', price: 85, stock: 2, min_stock: 1, description: 'Czujnik płomienia typu flame rod', compatibility: 'Uniwersalny dla kotłów gazowych' },
  { name: 'Czujnik ciągu kominowego', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'DRF-SENS-002', manufacturer: 'Junkers', brand: 'Bosch', price: 120, stock: 3, min_stock: 1, description: 'Czujnik kontroli ciągu kominowego', compatibility: 'Junkers, Bosch kotły gazowe' },
  { name: 'Termostat bezpieczeństwa STB', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'STB-SAFE-003', manufacturer: 'Honeywell', brand: 'Honeywell', price: 95, stock: 4, min_stock: 2, description: 'Termostat bezpieczeństwa STB', compatibility: 'Uniwersalny' },
  { name: 'Czujnik temperatury NTC 10kΩ', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'NTC-10K-004', manufacturer: 'Universal', brand: 'Universal', price: 45, stock: 8, min_stock: 3, description: 'Czujnik temperatury NTC 10kΩ', compatibility: 'Większość kotłów gazowych' },
  { name: 'Przełącznik ciśnieniowy wody', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'WPS-PRES-005', manufacturer: 'Vaillant', brand: 'Vaillant', price: 110, stock: 3, min_stock: 1, description: 'Przełącznik ciśnieniowy wody', compatibility: 'Vaillant kotły' },
  { name: 'Czujnik przepływu wody', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'WFS-FLOW-006', manufacturer: 'Viessmann', brand: 'Viessmann', price: 140, stock: 2, min_stock: 1, description: 'Czujnik przepływu wody', compatibility: 'Viessmann Vitopend' },
  { name: 'Elektrozawór gazowy SIT 845', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'SIT-845-007', manufacturer: 'SIT', brand: 'SIT', price: 180, stock: 2, min_stock: 1, description: 'Elektrozawór gazowy SIT 845', compatibility: 'Kotły z armaturą SIT' },
  { name: 'Zawór bezpieczeństwa 3 bar', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'SAF-VLV-008', manufacturer: 'Universal', brand: 'Universal', price: 35, stock: 6, min_stock: 2, description: 'Zawór bezpieczeństwa 3 bar', compatibility: 'Uniwersalny' },
  { name: 'Naczynie wzbiorcze 8L', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'EXP-8L-009', manufacturer: 'Reflex', brand: 'Reflex', price: 75, stock: 3, min_stock: 1, description: 'Naczynie wzbiorcze 8L', compatibility: 'Kotły do 24kW' },
  { name: 'Manometr 0-4 bar', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'MAN-4B-010', manufacturer: 'Universal', brand: 'Universal', price: 25, stock: 5, min_stock: 2, description: 'Manometr 0-4 bar', compatibility: 'Uniwersalny' },
  { name: 'Termostat pokojowy przewodowy', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'THM-WRD-011', manufacturer: 'Honeywell', brand: 'Honeywell', price: 85, stock: 4, min_stock: 2, description: 'Termostat pokojowy przewodowy', compatibility: 'Uniwersalny' },
  { name: 'Czujnik zewnętrzny temperatury', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'EXT-TMP-012', manufacturer: 'Vaillant', brand: 'Vaillant', price: 65, stock: 3, min_stock: 1, description: 'Czujnik zewnętrzny temperatury', compatibility: 'Vaillant kotły z regulacją pogodową' },
  { name: 'Detektor nieszczelności gazowej', category: 'Czujniki i elementy bezpieczeństwa', part_number: 'GAS-DET-013', manufacturer: 'Honeywell', brand: 'Honeywell', price: 250, stock: 1, min_stock: 1, description: 'Detektor nieszczelności gazowej', compatibility: 'Uniwersalny' }
];

const DEFAULT_WEBSITE_CONTENT = (() => {
  try {
    const filePath = path.resolve(__dirname, '../../../website/content/landing-default.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[database] Unable to read default website content:', error.message);
    return {
      hero: {},
      highlights: [],
      services: [],
      form: {}
    };
  }
})();

class DatabaseService {
  constructor() {
    this.db = null;
    this.installationId = null;
  }

  // Inicjalizacja bazy danych
  async initialize() {
    try {
      console.log('\n=== INITIALIZING DATABASE ===');
      
      // Ścieżka do katalogu userData
      const userDataPath = app.getPath('userData');
      console.log('Database directory:', userDataPath);

      // Stabilny identyfikator instalacji – hashujemy ścieżkę userData
      if (!this.installationId) {
        try {
          const hash = crypto.createHash('sha1').update(userDataPath).digest('hex');
          this.installationId = `inst-${hash}`;
        } catch (e) {
          console.warn('⚠️ Unable to derive installationId, using fallback:', e.message);
          this.installationId = 'inst-local-fallback';
        }
      }
      
      // Sprawdź czy katalog istnieje, jeśli nie - utwórz
      if (!fs.existsSync(userDataPath)) {
        console.log('Creating directory:', userDataPath);
        fs.mkdirSync(userDataPath, { recursive: true });
      } else {
        console.log('Directory already exists');
      }
      
      // Ścieżka do pliku bazy danych
      const dbPath = path.join(userDataPath, 'serwis.db');
      console.log('Database path:', dbPath);
      
      // Sprawdź czy plik bazy danych istnieje i jest kompatybilny
      const needsReset = await this.checkDatabaseCompatibility(dbPath);
      if (needsReset) {
        console.log('Database structure is incompatible, creating new database...');
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
        }
      }
      
      // Połącz z bazą danych
      await this.connect(dbPath);
      
      // Utwórz tabele
      await this.createTables();
      
      console.log('=== DATABASE INITIALIZATION COMPLETE ===');
      return true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  // Sprawdzanie kompatybilności bazy danych
  async checkDatabaseCompatibility(dbPath) {
    if (!fs.existsSync(dbPath)) {
      return false; // Nowa baza, nie trzeba resetować
    }
    
    try {
      // Tymczasowe połączenie do sprawdzenia struktury
      const tempDb = new sqlite3.Database(dbPath);
      
      return new Promise((resolve) => {
        tempDb.all("PRAGMA table_info(clients)", (err, rows) => {
          tempDb.close();
          
          if (err) {
            resolve(true); // Błąd = resetuj bazę
            return;
          }
          
          // Sprawdź czy tabela ma nową strukturę (first_name, last_name)
          const hasFirstName = rows.some(col => col.name === 'first_name');
          const hasLastName = rows.some(col => col.name === 'last_name');
          const hasOldName = rows.some(col => col.name === 'name');
          
          // Jeśli ma starą strukturę (name) a nie ma nowej (first_name, last_name) = resetuj
          resolve(hasOldName && (!hasFirstName || !hasLastName));
        });
      });
    } catch (error) {
      return true; // W razie błędu resetuj bazę
    }
  }

  // Połączenie z bazą danych
  connect(dbPath) {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database at:', dbPath);
          
          // Sprawdź czy plik istnieje
          const fileExists = fs.existsSync(dbPath);
          console.log('File exists after creation:', fileExists);
          try {
            // Włącz klucze obce i tryb WAL dla wydajności i spójności
            this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
            console.log('SQLite pragmas set: foreign_keys=ON, journal_mode=WAL');
          } catch (e) {
            console.log('Could not set SQLite pragmas:', e?.message);
          }
          
          resolve();
        }
      });
    });
  }

  // Tworzenie tabel
  async createTables() {
    const tables = [
      // Tabela klientów
      `CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        company_name TEXT,
        type TEXT DEFAULT 'individual',
        email TEXT,
        phone TEXT,
        address TEXT,
        address_street TEXT,
        address_city TEXT,
        address_postal_code TEXT,
        address_country TEXT,
        nip TEXT,
        regon TEXT,
        contact_person TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tabela kategorii urządzeń
      `CREATE TABLE IF NOT EXISTS device_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tabela kategorii usług
      `CREATE TABLE IF NOT EXISTS service_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        parent_id INTEGER,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES service_categories (id)
      )`,
      
      // Tabela kategorii części
      `CREATE TABLE IF NOT EXISTS part_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        parent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES part_categories (id)
      )`,

      // Tabela urządzeń
      `CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id TEXT UNIQUE,
        client_id INTEGER,
        category_id INTEGER,
        name TEXT NOT NULL,
        manufacturer TEXT,
        model TEXT,
        serial_number TEXT,
        production_year INTEGER,
        power_rating TEXT,
        fuel_type TEXT,
        installation_date DATE,
        last_service_date DATE,
        next_service_date DATE,
        warranty_end_date DATE,
        technical_data TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id),
        FOREIGN KEY (category_id) REFERENCES device_categories (id)
      )`,
      
      // Tabela użytkowników
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        mobile_pin_hash TEXT,
        mobile_pin_encrypted TEXT,
        role TEXT DEFAULT 'technician',
        mobile_authorized INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Tabela zleceń serwisowych
      `CREATE TABLE IF NOT EXISTS service_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        client_id INTEGER,
        device_id INTEGER,
        assigned_user_id INTEGER,
        service_categories TEXT,
        status TEXT DEFAULT 'new',
        priority TEXT DEFAULT 'medium',
        type TEXT DEFAULT 'maintenance',
        title TEXT,
        description TEXT,
        scheduled_date DATETIME,
        started_at DATETIME,
        completed_at DATETIME,
        estimated_hours REAL DEFAULT 0,
        actual_hours REAL DEFAULT 0,
        labor_cost REAL DEFAULT 0,
        parts_cost REAL DEFAULT 0,
        total_cost REAL DEFAULT 0,
        desktop_sync_status TEXT DEFAULT 'pending',
        estimated_cost_note TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id),
        FOREIGN KEY (device_id) REFERENCES devices (id),
        FOREIGN KEY (assigned_user_id) REFERENCES users (id)
      )`,
      
      // Powiązania zgłoszeń klientów z lokalnymi rekordami
      `CREATE TABLE IF NOT EXISTS service_request_links (
        request_id TEXT PRIMARY KEY,
        linked_client_id INTEGER,
        linked_client_name TEXT,
        linked_device_id INTEGER,
        linked_device_name TEXT,
        linked_device_model TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (linked_client_id) REFERENCES clients (id),
        FOREIGN KEY (linked_device_id) REFERENCES devices (id)
      )`,
      
      // Tabela części zamiennych
      `CREATE TABLE IF NOT EXISTS spare_parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        magazine_code TEXT UNIQUE,
        name TEXT NOT NULL,
        category TEXT,
        part_number TEXT,
        manufacturer TEXT,
        manufacturer_code TEXT,
        brand TEXT,
        assembly_group TEXT,
        barcode TEXT,
        net_price REAL DEFAULT 0,
        gross_price REAL DEFAULT 0,
        vat_rate REAL DEFAULT 23,
        currency TEXT DEFAULT 'PLN',
        price REAL DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 1,
        weight REAL DEFAULT 0,
        unit TEXT,
        package_size TEXT,
        description TEXT,
        model_compatibility TEXT,
        location TEXT,
        supplier TEXT,
        supplier_part_number TEXT,
        lead_time_days INTEGER DEFAULT 0,
        last_order_date TEXT,
        notes TEXT,
        supplier_id INTEGER,
        device_id INTEGER,
        synced_at DATETIME,
        updated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices (id)
      )`,
      
      // Tabela części użytych w zleceniach
      `CREATE TABLE IF NOT EXISTS order_parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        part_id INTEGER,
        quantity INTEGER DEFAULT 1,
        unit_price REAL DEFAULT 0,
        total_price REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES service_orders (id),
        FOREIGN KEY (part_id) REFERENCES spare_parts (id)
      )`,
      
      // Nowa tabela czasu pracy (dla integracji z mobilką)
      `CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        date TEXT,
        start_time TEXT,
        end_time TEXT,
        duration REAL DEFAULT 0,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES service_orders (id) ON DELETE CASCADE
      )`,
      
      // Tabela faktur
      `CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        client_id INTEGER,
        order_id INTEGER,
        issue_date DATE,
        due_date DATE,
        status TEXT DEFAULT 'draft',
        net_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        gross_amount REAL DEFAULT 0,
        payment_method TEXT,
        paid_date DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id),
        FOREIGN KEY (order_id) REFERENCES service_orders (id)
      )`,
      
      // Tabela pozycji faktur
      `CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER,
        description TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        unit_price REAL DEFAULT 0,
        net_amount REAL DEFAULT 0,
        tax_rate REAL DEFAULT 23,
        tax_amount REAL DEFAULT 0,
        gross_amount REAL DEFAULT 0,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id)
      )`,
      
      // Tabela wydarzeń kalendarza
      `CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        start_date DATETIME NOT NULL,
        end_date DATETIME,
        type TEXT DEFAULT 'appointment',
        related_id INTEGER,
        client_id INTEGER,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id)
      )`,
      
      // Tabela plików urządzeń
      `CREATE TABLE IF NOT EXISTS device_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_category TEXT DEFAULT 'other',
        file_size INTEGER DEFAULT 0,
        mime_type TEXT,
        title TEXT,
        description TEXT,
        is_primary INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS service_protocols (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        technician_id INTEGER,
        client_id INTEGER,
        device_id INTEGER,
        template_name TEXT,
        template_version INTEGER DEFAULT 1,
        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        desktop_sync_status TEXT DEFAULT 'pending',
        remote_id INTEGER,
        remote_url TEXT,
        service_company_snapshot TEXT,
        client_snapshot TEXT,
        device_snapshot TEXT,
        technician_snapshot TEXT,
        checks_snapshot TEXT,
        steps_snapshot TEXT,
        parts_snapshot TEXT,
        summary_text TEXT,
        notes TEXT,
        acceptance_clause TEXT,
        pdf_filename TEXT,
        local_pdf_path TEXT,
        pdf_uploaded INTEGER DEFAULT 0,
        FOREIGN KEY (order_id) REFERENCES service_orders (id) ON DELETE CASCADE,
        FOREIGN KEY (technician_id) REFERENCES users (id),
        FOREIGN KEY (client_id) REFERENCES clients (id),
        FOREIGN KEY (device_id) REFERENCES devices (id)
      )`,

      `CREATE TABLE IF NOT EXISTS website_content_blocks (
        slug TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL DEFAULT '{}',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS inventory_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshot_id INTEGER NOT NULL,
        manufacturer_code TEXT,
        magazine_code TEXT,
        name TEXT,
        qty_stock REAL DEFAULT 0,
        qty_counted REAL DEFAULT 0,
        net_price REAL DEFAULT 0,
        vat_rate REAL DEFAULT 23,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (snapshot_id) REFERENCES inventory_snapshots (id) ON DELETE CASCADE
      )`,

      `CREATE INDEX IF NOT EXISTS idx_inventory_items_snapshot ON inventory_items(snapshot_id)`
    ];

    try {
      for (const table of tables) {
        await this.run(table);
      }
      
      // Uruchom migracje
      await this.runMigrations();
      
      // Dodaj domyślne dane
      await this.insertDefaultData();
      
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  // Migracje bazy danych
  async runMigrations() {
    console.log('Running database migrations...');
    
    try {
      const installationId = this.getInstallationId();

      // Sprawdź czy kolumny istnieją przed dodaniem
      const serviceOrdersColumns = await this.getTableColumns('service_orders');
      // Dodaj kolumnę desktop_sync_status (idempotentnie) – kontrola widoczności w "Do wysłania"
      if (!serviceOrdersColumns.includes('desktop_sync_status')) {
        await this.run("ALTER TABLE service_orders ADD COLUMN desktop_sync_status TEXT DEFAULT 'pending'");
        console.log('Migration: Added desktop_sync_status column to service_orders table');
      }
      
      // Migracja 1: Dodanie kolumny service_categories
      if (!serviceOrdersColumns.includes('service_categories')) {
        await this.run('ALTER TABLE service_orders ADD COLUMN service_categories TEXT');
        console.log('Migration: Added service_categories column to service_orders table');
      } else {
        console.log('Migration: service_categories column already exists');
      }
      
      // Upewnij się, że istnieje kolumna parts_used dla importu z mobilki
      if (!serviceOrdersColumns.includes('parts_used')) {
        await this.run('ALTER TABLE service_orders ADD COLUMN parts_used TEXT');
        console.log('Migration: Added parts_used column to service_orders table');
      }
      // Powód przedwczesnego zamknięcia – wymagany do statusu "przed czasem"
      if (!serviceOrdersColumns.includes('rejected_reason')) {
        try {
          await this.run('ALTER TABLE service_orders ADD COLUMN rejected_reason TEXT');
          console.log('Migration: Added rejected_reason column to service_orders table');
        } catch (e) { console.log('Migration: rejected_reason already exists or cannot be added:', e?.message) }
      }
      // Dodaj kolumnę estimated_cost_note – opis szacunku kosztu widoczny w mobilce
      if (!serviceOrdersColumns.includes('estimated_cost_note')) {
        await this.run('ALTER TABLE service_orders ADD COLUMN estimated_cost_note TEXT');
        console.log('Migration: Added estimated_cost_note column to service_orders table');
      }
      
      // Migracje dla tabeli users (dodanie phone i mobile_pin_hash, idempotentnie)
      const usersColumns = await this.getTableColumns('users');
      if (!usersColumns.includes('phone')) {
        await this.run('ALTER TABLE users ADD COLUMN phone TEXT');
        console.log('Migration: Added phone column to users table');
      }
      if (!usersColumns.includes('mobile_pin_hash')) {
        await this.run('ALTER TABLE users ADD COLUMN mobile_pin_hash TEXT');
        console.log('Migration: Added mobile_pin_hash column to users table');
      }
      if (!usersColumns.includes('mobile_pin_encrypted')) {
        await this.run('ALTER TABLE users ADD COLUMN mobile_pin_encrypted TEXT');
        console.log('Migration: Added mobile_pin_encrypted column to users table');
      }
      if (!usersColumns.includes('mobile_authorized')) {
        await this.run('ALTER TABLE users ADD COLUMN mobile_authorized INTEGER DEFAULT 1');
        console.log('Migration: Added mobile_authorized column to users table');
      }

      // Sprawdź part_categories
      const partCategoriesColumns = await this.getTableColumns('part_categories');
      if (!partCategoriesColumns.includes('description')) {
        try {
          await this.run('ALTER TABLE part_categories ADD COLUMN description TEXT');
          console.log('Migration: Added description column to part_categories table');
        } catch (e) {
          console.log('Migration: description column already exists or cannot be added:', e?.message);
        }
      }
      if (!partCategoriesColumns.includes('sort_order')) {
        try {
          await this.run('ALTER TABLE part_categories ADD COLUMN sort_order INTEGER DEFAULT 0');
          console.log('Migration: Added sort_order column to part_categories table');
        } catch (e) {
          console.log('Migration: sort_order column already exists or cannot be added:', e?.message);
        }
      }
      if (!partCategoriesColumns.includes('is_active')) {
        try {
          await this.run('ALTER TABLE part_categories ADD COLUMN is_active INTEGER DEFAULT 1');
          console.log('Migration: Added is_active column to part_categories table');
        } catch (e) {
          console.log('Migration: is_active column already exists or cannot be added:', e?.message);
        }
      }
      if (!partCategoriesColumns.includes('parent_id')) {
        try {
          await this.run('ALTER TABLE part_categories ADD COLUMN parent_id INTEGER');
          console.log('Migration: Added parent_id column to part_categories table');
        } catch (e) {
          console.log('Migration: parent_id column already exists or cannot be added:', e?.message);
        }
      }
      if (!partCategoriesColumns.includes('created_at')) {
        try {
          await this.run('ALTER TABLE part_categories ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
          console.log('Migration: Added created_at column to part_categories table');
        } catch (e) {
          console.log('Migration: created_at column already exists or cannot be added:', e?.message);
        }
      }
      if (!partCategoriesColumns.includes('updated_at')) {
        try {
          await this.run('ALTER TABLE part_categories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
          console.log('Migration: Added updated_at column to part_categories table');
        } catch (e) {
          console.log('Migration: updated_at column already exists or cannot be added:', e?.message);
        }
      }
      try {
        await this.run('DROP INDEX IF EXISTS part_categories_name_key');
        await this.run('DROP INDEX IF EXISTS ux_part_categories_name');
      } catch (e) {
        console.log('Migration: Unable to drop legacy part_categories indexes (may not exist):', e?.message);
      }
      try {
        await this.run('CREATE INDEX IF NOT EXISTS idx_part_categories_parent ON part_categories(parent_id)');
      } catch (e) {
        console.log('Migration: idx_part_categories_parent already exists or cannot be created:', e?.message);
      }
      try {
        await this.run('CREATE UNIQUE INDEX IF NOT EXISTS ux_part_categories_root_name ON part_categories(name) WHERE parent_id IS NULL');
      } catch (e) {
        console.log('Migration: ux_part_categories_root_name already exists or cannot be created:', e?.message);
      }
      try {
        await this.run('CREATE UNIQUE INDEX IF NOT EXISTS ux_part_categories_parent_name ON part_categories(parent_id, name) WHERE parent_id IS NOT NULL');
      } catch (e) {
        console.log('Migration: ux_part_categories_parent_name already exists or cannot be created:', e?.message);
      }

      // Sprawdź spare_parts
      const sparePartsColumns = await this.getTableColumns('spare_parts');
      
      if (!sparePartsColumns.includes('magazine_code')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN magazine_code TEXT');
      }
      if (!sparePartsColumns.includes('manufacturer_code')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN manufacturer_code TEXT');
      }
      if (!sparePartsColumns.includes('assembly_group')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN assembly_group TEXT');
      }
      if (!sparePartsColumns.includes('barcode')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN barcode TEXT');
      }
      if (!sparePartsColumns.includes('net_price')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN net_price REAL DEFAULT 0');
      }
      if (!sparePartsColumns.includes('gross_price')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN gross_price REAL DEFAULT 0');
      }
      if (!sparePartsColumns.includes('vat_rate')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN vat_rate REAL DEFAULT 23');
      }
      if (!sparePartsColumns.includes('currency')) {
        await this.run(`ALTER TABLE spare_parts ADD COLUMN currency TEXT DEFAULT 'PLN'`);
      }
      if (!sparePartsColumns.includes('weight')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN weight REAL DEFAULT 0');
      }
      if (!sparePartsColumns.includes('unit')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN unit TEXT');
      }
      if (!sparePartsColumns.includes('package_size')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN package_size TEXT');
      }
      if (!sparePartsColumns.includes('synced_at')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN synced_at DATETIME');
      }
      if (!sparePartsColumns.includes('updated_by')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN updated_by TEXT');
      }

      // Migracja 2: Dodanie kolumny device_id
      if (!sparePartsColumns.includes('device_id')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN device_id INTEGER REFERENCES devices(id)');
        console.log('Migration: Added device_id column to spare_parts table');
      } else {
        console.log('Migration: device_id column already exists');
      }
      
      // Migracja 3: Dodanie kolumny brand
      if (!sparePartsColumns.includes('brand')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN brand TEXT');
        console.log('Migration: Added brand column to spare_parts table');
      } else {
        console.log('Migration: brand column already exists');
      }
      
      // Migracja 4: Dodanie kolumny model_compatibility
      if (!sparePartsColumns.includes('model_compatibility')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN model_compatibility TEXT');
        console.log('Migration: Added model_compatibility column to spare_parts table');
      } else {
        console.log('Migration: model_compatibility column already exists');
      }
      
      // Migracja 4b: Kolumny używane przez formularz części (lokalizacja/dostawca/terminy)
      if (!sparePartsColumns.includes('location')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN location TEXT');
        console.log('Migration: Added location column to spare_parts table');
      }
      if (!sparePartsColumns.includes('supplier')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN supplier TEXT');
        console.log('Migration: Added supplier column to spare_parts table');
      }
      if (!sparePartsColumns.includes('supplier_part_number')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN supplier_part_number TEXT');
        console.log('Migration: Added supplier_part_number column to spare_parts table');
      }
      if (!sparePartsColumns.includes('lead_time_days')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN lead_time_days INTEGER DEFAULT 0');
        console.log('Migration: Added lead_time_days column to spare_parts table');
      }
      if (!sparePartsColumns.includes('last_order_date')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN last_order_date TEXT');
        console.log('Migration: Added last_order_date column to spare_parts table');
      }
      if (!sparePartsColumns.includes('notes')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN notes TEXT');
        console.log('Migration: Added notes column to spare_parts table');
      }

      // === Suppliers feature (additive, idempotent) ===
      // Create suppliers table if not exists
      await this.run(`CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        nip TEXT UNIQUE,
        regon TEXT,
        krs TEXT,
        email TEXT,
        phone TEXT,
        address_street TEXT,
        address_city TEXT,
        address_postal_code TEXT,
        address_country TEXT DEFAULT 'Polska',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create supplier_contacts table if not exists
      await this.run(`CREATE TABLE IF NOT EXISTS supplier_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        full_name TEXT,
        email TEXT,
        phone TEXT,
        role TEXT,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )`);

      // Add supplier_id column to spare_parts if missing
      const sparePartsColumns2 = await this.getTableColumns('spare_parts');
      if (!sparePartsColumns2.includes('supplier_id')) {
        await this.run('ALTER TABLE spare_parts ADD COLUMN supplier_id INTEGER');
        console.log('Migration: Added supplier_id column to spare_parts table');
      }

      // Helpful indexes
      try { await this.run('CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)'); } catch (_) {}
      try { await this.run('CREATE INDEX IF NOT EXISTS idx_suppliers_nip ON suppliers(nip)'); } catch (_) {}
      try { await this.run('CREATE INDEX IF NOT EXISTS idx_spare_parts_supplier_id ON spare_parts(supplier_id)'); } catch (_) {}
      try { await this.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_spare_parts_mag_code ON spare_parts(magazine_code) WHERE magazine_code IS NOT NULL AND TRIM(magazine_code) <> ""'); } catch (_) {}
      try { await this.run('CREATE INDEX IF NOT EXISTS idx_spare_parts_barcode ON spare_parts(barcode)'); } catch (_) {}
      try { await this.run('CREATE INDEX IF NOT EXISTS idx_spare_parts_part_number ON spare_parts(part_number)'); } catch (_) {}

      // Uzupełnij nowe kolumny wartościami domyślnymi
      try {
        await this.run(`UPDATE spare_parts SET vat_rate = 23 WHERE vat_rate IS NULL`);
        await this.run(`UPDATE spare_parts SET gross_price = CASE WHEN gross_price IS NULL OR gross_price = 0 THEN price ELSE gross_price END`);
        await this.run(`UPDATE spare_parts SET net_price = CASE 
          WHEN net_price IS NULL OR net_price = 0 THEN 
            ROUND(CASE WHEN (vat_rate IS NULL OR vat_rate = 0) THEN 
              COALESCE(gross_price, price) 
            ELSE 
              COALESCE(gross_price, price) / (1 + (vat_rate/100.0)) 
            END, 2)
          ELSE net_price
        END`);
        await this.run(`UPDATE spare_parts SET currency = 'PLN' WHERE currency IS NULL OR TRIM(currency) = ''`);
      } catch (e) {
        console.log('Migration: unable to backfill new spare_parts price columns', e?.message);
      }
      
      // Migracja 5: order_parts użyje JOIN z spare_parts dla kolumny name
      console.log('Migration: order_parts will use JOIN with spare_parts for name column');
      
      // ===== MIGRACJE MOBILNE =====
      // Migracja 6: Dodanie kolumn dla funkcjonalności mobilnej
      
      // actual_start_date - rzeczywisty czas rozpoczęcia pracy
      if (!serviceOrdersColumns.includes('actual_start_date')) {
        await this.run('ALTER TABLE service_orders ADD COLUMN actual_start_date DATETIME');
        console.log('Migration: Added actual_start_date column to service_orders table');
      } else {
        console.log('Migration: actual_start_date column already exists');
      }
      
      // actual_end_date - rzeczywisty czas zakończenia pracy
      if (!serviceOrdersColumns.includes('actual_end_date')) {
        await this.run('ALTER TABLE service_orders ADD COLUMN actual_end_date DATETIME');
        console.log('Migration: Added actual_end_date column to service_orders table');
      } else {
        console.log('Migration: actual_end_date column already exists');
      }
      
      // completed_categories - JSON z kategorii wykonanych przez technika
      if (!serviceOrdersColumns.includes('completed_categories')) {
        await this.run('ALTER TABLE service_orders ADD COLUMN completed_categories TEXT');
        console.log('Migration: Added completed_categories column to service_orders table');
      } else {
        console.log('Migration: completed_categories column already exists');
      }
      
      // work_photos - JSON ze zdjęciami wykonanymi podczas pracy
      if (!serviceOrdersColumns.includes('work_photos')) {
        await this.run('ALTER TABLE service_orders ADD COLUMN work_photos TEXT');
        console.log('Migration: Added work_photos column to service_orders table');
      } else {
        console.log('Migration: work_photos column already exists');
      }
      
      // Upewnij się, że tabela time_entries istnieje oraz ma kolumnę date
      const timeEntriesColumns = await this.getTableColumns('time_entries');
      if (!timeEntriesColumns || timeEntriesColumns.length === 0) {
        await this.run(`CREATE TABLE IF NOT EXISTS time_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, date TEXT, start_time TEXT, end_time TEXT, duration REAL DEFAULT 0, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (order_id) REFERENCES service_orders (id) ON DELETE CASCADE)`);
        console.log('Migration: Created time_entries table');
      } else if (!timeEntriesColumns.includes('date')) {
        await this.run('ALTER TABLE time_entries ADD COLUMN date TEXT');
        console.log('Migration: Added date column to time_entries table');
      }
      
      // MIGRATION FIX: Kopiuj dane z assigned_to do assigned_user_id jeśli istnieją
      if (serviceOrdersColumns.includes('assigned_to')) {
        console.log('Migration: Copying data from assigned_to to assigned_user_id...');
        // Skopiuj dane gdzie assigned_user_id jest NULL ale assigned_to ma wartość
        await this.run(`
          UPDATE service_orders 
          SET assigned_user_id = assigned_to 
          WHERE assigned_user_id IS NULL AND assigned_to IS NOT NULL
        `);
        console.log('Migration: Data copied from assigned_to to assigned_user_id');
      } else {
        console.log('Migration: assigned_to column does not exist - no data to copy');
      }
      
      // Migracje dla tabeli clients
      const clientsColumns = await this.getTableColumns('clients');
      
      if (!clientsColumns.includes('external_id')) {
        await this.run('ALTER TABLE clients ADD COLUMN external_id TEXT');
        console.log('Migration: Added external_id column to clients table');
      } else {
        console.log('Migration: external_id column already exists on clients table');
      }
      try {
        await this.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_external_id ON clients(external_id)');
      } catch (e) {
        console.log('Migration: idx_clients_external_id already exists or cannot be created:', e?.message);
      }
      await this.ensureExternalIds('clients', 'external_id', `${installationId}:client:`);
      await this.ensureExternalIdTrigger('clients', 'external_id', `${installationId}:client:`);
      
      // Migracja 6: Dodanie kolumny address_street
      if (!clientsColumns.includes('address_street')) {
        await this.run('ALTER TABLE clients ADD COLUMN address_street TEXT');
        console.log('Migration: Added address_street column to clients table');
      } else {
        console.log('Migration: address_street column already exists');
      }
      
      // Migracja 7: Dodanie kolumny address_city
      if (!clientsColumns.includes('address_city')) {
        await this.run('ALTER TABLE clients ADD COLUMN address_city TEXT');
        console.log('Migration: Added address_city column to clients table');
      } else {
        console.log('Migration: address_city column already exists');
      }
      
      // Migracja 8: Dodanie kolumny address_postal_code
      if (!clientsColumns.includes('address_postal_code')) {
        await this.run('ALTER TABLE clients ADD COLUMN address_postal_code TEXT');
        console.log('Migration: Added address_postal_code column to clients table');
      } else {
        console.log('Migration: address_postal_code column already exists');
      }
      
      // Migracja 9: Dodanie kolumny address_country
      if (!clientsColumns.includes('address_country')) {
        await this.run('ALTER TABLE clients ADD COLUMN address_country TEXT');
        console.log('Migration: Added address_country column to clients table');
      } else {
        console.log('Migration: address_country column already exists');
      }
      
      // Migracja 10: Dodanie kolumny regon
      if (!clientsColumns.includes('regon')) {
        await this.run('ALTER TABLE clients ADD COLUMN regon TEXT');
        console.log('Migration: Added regon column to clients table');
      } else {
        console.log('Migration: regon column already exists');
      }
      
      // Migracja 11: Dodanie kolumny is_active
      if (!clientsColumns.includes('is_active')) {
        await this.run('ALTER TABLE clients ADD COLUMN is_active INTEGER DEFAULT 1');
        console.log('Migration: Added is_active column to clients table');
      } else {
        console.log('Migration: is_active column already exists');
      }
      
      // Migracja 12: Poprawka struktury tabeli clients - usunięcie NOT NULL z first_name i last_name
      // Sprawdź czy trzeba poprawić strukturę (tylko jeśli tabela ma NOT NULL constraints)
      const clientsInfo = await this.query('PRAGMA table_info(clients)');
      const firstNameColumn = clientsInfo.find(col => col.name === 'first_name');
      const lastNameColumn = clientsInfo.find(col => col.name === 'last_name');
      
      // Jeśli kolumny mają NOT NULL constraint, przeprowadź migrację
      if (firstNameColumn && firstNameColumn.notnull === 1) {
        console.log('Migration: Fixing clients table structure - removing NOT NULL constraints');
        
        // Utwórz tymczasową tabelę z poprawną strukturą
        await this.run(`
          CREATE TABLE clients_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT,
            last_name TEXT,
            company_name TEXT,
            type TEXT DEFAULT 'individual',
            email TEXT,
            phone TEXT,
            address TEXT,
            address_street TEXT,
            address_city TEXT,
            address_postal_code TEXT,
            address_country TEXT,
            nip TEXT,
            regon TEXT,
            contact_person TEXT,
            notes TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Skopiuj dane ze starej tabeli do nowej
        await this.run(`
          INSERT INTO clients_new 
          SELECT * FROM clients
        `);
        
        // Usuń starą tabelę
        await this.run('DROP TABLE clients');
        
        // Zmień nazwę nowej tabeli
        await this.run('ALTER TABLE clients_new RENAME TO clients');
        
        console.log('Migration: Successfully updated clients table structure');
      } else {
        console.log('Migration: clients table structure is already correct');
      }
      
      // Migracje dla tabeli service_protocols – ensure order_number column exists
      try {
        const protocolCols = await this.getTableColumns('service_protocols');
        if (Array.isArray(protocolCols) && !protocolCols.includes('order_number')) {
          await this.run('ALTER TABLE service_protocols ADD COLUMN order_number TEXT');
          console.log('Migration: Added order_number column to service_protocols table');
        } else {
          console.log('Migration: order_number column already exists in service_protocols table');
        }
      } catch (protocolErr) {
        console.log('Migration: Unable to ensure service_protocols order_number column:', protocolErr?.message);
      }
      
      // Migracje dla tabeli devices - zapewnij kolumnę external_id
      const devicesColumns = await this.getTableColumns('devices');
      if (Array.isArray(devicesColumns)) {
        if (!devicesColumns.includes('external_id')) {
          await this.run('ALTER TABLE devices ADD COLUMN external_id TEXT');
          console.log('Migration: Added external_id column to devices table');
        } else {
          console.log('Migration: external_id column already exists on devices table');
        }
        try {
          await this.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_external_id ON devices(external_id)');
        } catch (e) {
          console.log('Migration: idx_devices_external_id already exists or cannot be created:', e?.message);
        }
        await this.ensureExternalIds('devices', 'external_id', `${installationId}:device:`);
        await this.ensureExternalIdTrigger('devices', 'external_id', `${installationId}:device:`);
      } else {
        console.log('Migration: Could not inspect devices table structure (table may not exist yet)');
      }
      
      // Migracja 13: Sprawdź czy tabela device_files istnieje
      const deviceFilesExists = await this.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='device_files'"
      );
      
      if (!deviceFilesExists || deviceFilesExists.length === 0) {
        console.log('Migration: device_files table will be created by table creation process');
      } else {
        console.log('Migration: device_files table already exists');
      }
      
      // Indeksy dla device_files - dla wydajności
      try {
        await this.run('CREATE INDEX IF NOT EXISTS idx_device_files_device_id ON device_files(device_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_device_files_file_type ON device_files(file_type)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_device_files_category ON device_files(file_category)');
        console.log('Migration: Created indexes for device_files table');
      } catch (error) {
        console.log('Migration: Indexes for device_files already exist or error occurred:', error.message);
      }
      
      // DODATKOWE INDEKSY WYDAJNOŚCIOWE (bezpieczne i idempotentne)
      try {
        // Clients
        await this.run('CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_clients_last_first ON clients(last_name, first_name)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at)');

        // Devices
        await this.run('CREATE INDEX IF NOT EXISTS idx_devices_client_id ON devices(client_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_devices_is_active ON devices(is_active)');

        // Service orders
        await this.run('CREATE INDEX IF NOT EXISTS idx_orders_client_id ON service_orders(client_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_orders_assigned_user_id ON service_orders(assigned_user_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_orders_status ON service_orders(status)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON service_orders(created_at)');

        // Time entries / calendar / parts / invoices
        await this.run('CREATE INDEX IF NOT EXISTS idx_time_entries_order_id ON time_entries(order_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_calendar_client_id ON calendar_events(client_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_order_parts_order_id ON order_parts(order_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)');
        console.log('Migration: Created performance indexes');
      } catch (error) {
        console.log('Migration: Creating performance indexes failed or already exists:', error.message);
      }
      
      console.log('Migrations completed');
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  }

  // Pomocnicza funkcja do sprawdzania kolumn w tabeli
  async getTableColumns(tableName) {
    try {
      const result = await this.query(`PRAGMA table_info(${tableName})`);
      return result.map(col => col.name);
    } catch (error) {
      console.error(`Error getting columns for table ${tableName}:`, error);
      return [];
    }
  }

  // Dodanie domyślnych danych
  async insertDefaultData() {
    try {
      // Sprawdź czy dane już istnieją
      const existingUsers = await this.query('SELECT COUNT(*) as count FROM users');
      if (existingUsers[0].count === 0) {
        // Dodaj domyślnego użytkownika admin/admin123
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await this.run(
          'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
          ['admin', hashedPassword, 'Administrator', 'admin']
        );
        
        // Dodaj technika
        const techPassword = await bcrypt.hash('tech123', 10);
        await this.run(
          'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
          ['technik1', techPassword, 'Jan Technik', 'technician']
        );
        
        console.log('Dodano domyślnego użytkownika admin i technika');
      }

      // Sprawdź kategorie urządzeń
      const existingCategories = await this.query('SELECT COUNT(*) as count FROM device_categories');
      if (existingCategories[0].count === 0) {
        const categories = [
          'Kotły gazowe',
          'Kotły olejowe', 
          'Kotły na paliwo stałe',
          'Pompy ciepła',
          'Systemy solarne',
          'Klimatyzacja',
          'Wentylacja'
        ];
        
        for (const category of categories) {
          await this.run(
            'INSERT INTO device_categories (name) VALUES (?)',
            [category]
          );
        }
        console.log('Dodano domyślne kategorie urządzeń');
      }

      // Sprawdź części zamienne
      const existingParts = await this.query('SELECT COUNT(*) as count FROM spare_parts');
      if (SHOULD_SEED_DEFAULT_SPARE_PARTS) {
        if (existingParts[0].count === 0) {
          await this.insertDefaultSpareParts();
        }
      } else {
        await this.removeDefaultSpareParts();
      }
      
      if (SHOULD_SEED_SAMPLE_DATA) {
        await this.insertSampleData();
      } else {
        console.log('Pomijam dodawanie przykładowych danych (SEED_SAMPLE_DATA !== "1")');
      }

      try {
        const websiteRows = await this.query('SELECT COUNT(*) as count FROM website_content_blocks WHERE slug = ?', ['landing']).catch(() => []);
        const websiteCount = Array.isArray(websiteRows) && websiteRows.length ? Number(websiteRows[0].count || 0) : 0;
        if (websiteCount === 0) {
          await this.run(
            'INSERT INTO website_content_blocks (slug, payload_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            ['landing', JSON.stringify(DEFAULT_WEBSITE_CONTENT || {})]
          );
          console.log('Dodano domyślną treść strony www (landing)');
        }
      } catch (error) {
        console.warn('⚠️ Nie udało się zainicjować treści strony www:', error?.message || error);
      }
      
    } catch (error) {
      console.error('Błąd podczas dodawania domyślnych danych:', error);
    }
  }

  // Dodanie przykładowych danych testowych
  async insertSampleData() {
    try {
      console.log('Dodaję przykładowe dane testowe...');
      
      // Sprawdź czy już są przykładowe dane
      const existingClients = await this.query('SELECT COUNT(*) as count FROM clients');
      if (existingClients[0].count > 0) {
        console.log('Przykładowe dane już istnieją');
        return;
      }

      // Dodaj domyślne kategorie usług
      await this.addDefaultServiceCategories();

      // Dodaj przykładowych klientów
      const client1Result = await this.run(
        'INSERT INTO clients (first_name, last_name, company_name, type, email, phone, address, nip, contact_person, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        ['Jan', 'Kowalski', 'Kowalski Sp. z o.o.', 'business', 'jan.kowalski@example.com', '+48 123 456 789', 'ul. Główna 15, 00-001 Warszawa', '1234567890', 'Jan Kowalski', 'Stały klient - kotłownia przemysłowa']
      );

      const client2Result = await this.run(
        'INSERT INTO clients (first_name, last_name, company_name, type, email, phone, address, contact_person, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        ['Maria', 'Nowak', 'ABC Firma', 'business', 'maria.nowak@abc.com', '+48 987 654 321', 'ul. Przemysłowa 45, 02-600 Warszawa', 'Maria Nowak', 'Nowy klient']
      );

      const client3Result = await this.run(
        'INSERT INTO clients (first_name, last_name, type, email, phone, address, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        ['Piotr', 'Wiśniewski', 'individual', 'piotr.wisniewski@gmail.com', '+48 555 123 456', 'ul. Słoneczna 12, 03-200 Warszawa', 'Klient indywidualny - dom jednorodzinny']
      );

      // Dodaj przykładowe urządzenia
      const device1Result = await this.run(
        'INSERT INTO devices (client_id, category_id, name, manufacturer, model, serial_number, production_year, power_rating, fuel_type, installation_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [client1Result.id, 1, 'Kocioł gazowy kondensacyjny', 'Vaillant', 'ecoTEC plus VU 246/5-5', 'VL2023001234', 2023, '24kW', 'Gaz ziemny', '2023-03-15', 'Kocioł w kotłowni przemysłowej']
      );

      const device2Result = await this.run(
        'INSERT INTO devices (client_id, category_id, name, manufacturer, model, serial_number, production_year, power_rating, fuel_type, installation_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [client2Result.id, 1, 'Kocioł gazowy ścienny', 'Junkers', 'Cerapur Excellence ZWB 28-3CE', 'JU2022005678', 2022, '28kW', 'Gaz ziemny', '2022-09-20', 'Kocioł c.o. + c.w.u.']
      );

      const device3Result = await this.run(
        'INSERT INTO devices (client_id, category_id, name, manufacturer, model, serial_number, production_year, power_rating, fuel_type, installation_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [client3Result.id, 4, 'Pompa ciepła', 'Viessmann', 'Vitocal 200-S AWB-M 201.A06', 'VI2023007890', 2023, '6kW', 'Energia elektryczna', '2023-05-10', 'Pompa ciepła powietrze/woda']
      );

      // Dodaj przykładowe zlecenia z aktualnymi datami
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Zlecenia przypisane do technika (ID=2) - FIXED: używamy assigned_user_id
      await this.run(
        'INSERT INTO service_orders (order_number, client_id, device_id, assigned_user_id, service_categories, status, priority, type, title, description, scheduled_date, estimated_hours, labor_cost, parts_cost, total_cost, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        ['SRV-2025-001', client1Result.id, device1Result.id, 2, '["A1", "A3", "B4"]', 'new', 'high', 'maintenance', 'Przegląd roczny kotła Vaillant', 'Kompleksowy przegląd kotła gazowego - kontrola spalania, czyszczenie palnika i wymiennika', today.toISOString(), 3, 150, 85, 235, 'Zaplanowany przegląd roczny']
      );

      await this.run(
        'INSERT INTO service_orders (order_number, client_id, device_id, assigned_user_id, service_categories, status, priority, type, title, description, scheduled_date, estimated_hours, labor_cost, parts_cost, total_cost, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        ['SRV-2025-002', client2Result.id, device2Result.id, 2, '["G1", "B5", "A2"]', 'new', 'medium', 'repair', 'Naprawa awaryjna - brak ciepłej wody', 'Diagnoza usterki układu c.w.u., wymiana elektrody jonizacyjnej, czyszczenie palnika', tomorrow.toISOString(), 2, 120, 45, 165, 'Zgłoszenie awaryjne']
      );

      await this.run(
        'INSERT INTO service_orders (order_number, client_id, device_id, assigned_user_id, service_categories, status, priority, type, title, description, scheduled_date, estimated_hours, labor_cost, parts_cost, total_cost, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        ['SRV-2025-003', client3Result.id, device3Result.id, 2, '["A1", "B8"]', 'new', 'medium', 'maintenance', 'Przegląd pompy ciepła', 'Kontrola parametrów pracy pompy ciepła, wymiana czujnika temperatury', nextWeek.toISOString(), 2.5, 125, 35, 160, 'Przegląd sezonowy']
      );

      console.log('Dodano przykładowe dane testowe');
    } catch (error) {
      console.error('Błąd podczas dodawania przykładowych danych:', error);
    }
  }

  // Dodanie domyślnych kategorii usług
  async addDefaultServiceCategories() {
    try {
      console.log('Dodaję domyślne kategorie usług...');
      
      // Sprawdź czy kategorie już istnieją
      const existingCategories = await this.query('SELECT COUNT(*) as count FROM service_categories');
      if (existingCategories[0].count > 0) {
        console.log('Domyślne kategorie usług już istnieją');
        return;
      }

      const defaultCategories = [
        // Główne kategorie (A-I)
        { code: 'A', name: 'Przeglądy i konserwacje', description: 'Rutynowe przeglądy i konserwacja urządzeń', sort_order: 1 },
        { code: 'B', name: 'Diagnostyka i naprawy', description: 'Diagnostyka problemów i naprawy awaryjne', sort_order: 2 },
        { code: 'C', name: 'Pomiary i regulacje', description: 'Pomiary parametrów i regulacja urządzeń', sort_order: 3 },
        { code: 'D', name: 'Stacje uzdatniania wody i badania', description: 'Serwis stacji uzdatniania wody', sort_order: 4 },
        { code: 'E', name: 'Usługi hydrauliczne', description: 'Instalacje i serwis hydrauliczny', sort_order: 5 },
        { code: 'F', name: 'Serwis przemysłowy', description: 'Serwis urządzeń przemysłowych', sort_order: 6 },
        { code: 'G', name: 'Pogotowie serwisowe', description: 'Awarie i interwencje awaryjne', sort_order: 7 },
        { code: 'H', name: 'Części i materiały', description: 'Wymiana części i materiałów', sort_order: 8 },
        { code: 'I', name: 'Usługi specjalistyczne i techniczne', description: 'Specjalistyczne usługi techniczne', sort_order: 9 }
      ];

      // Dodaj główne kategorie
      for (const category of defaultCategories) {
        await this.run(`
          INSERT INTO service_categories (code, name, description, sort_order, is_active)
          VALUES (?, ?, ?, ?, 1)
        `, [category.code, category.name, category.description, category.sort_order]);
      }
      
      // Pobierz ID głównych kategorii do tworzenia podkategorii
      const mainCategories = await this.query('SELECT id, code FROM service_categories WHERE parent_id IS NULL');
      
      // Dodaj przykładowe podkategorie
      const subCategories = [
        // Podkategorie dla kategorii A (Przeglądy i konserwacje)
        { parent_code: 'A', code: 'A1', name: 'Przegląd roczny', description: 'Roczny przegląd urządzeń' },
        { parent_code: 'A', code: 'A2', name: 'Konserwacja okresowa', description: 'Okresowa konserwacja' },
        { parent_code: 'A', code: 'A3', name: 'Czyszczenie filtrów', description: 'Czyszczenie i wymiana filtrów' },
        
        // Podkategorie dla kategorii B (Diagnostyka i naprawy)
        { parent_code: 'B', code: 'B1', name: 'Diagnostyka elektroniczna', description: 'Diagnostyka układów elektronicznych' },
        { parent_code: 'B', code: 'B2', name: 'Naprawa mechaniczna', description: 'Naprawa elementów mechanicznych' },
        { parent_code: 'B', code: 'B3', name: 'Wymiana części', description: 'Wymiana uszkodzonych części' },
        
        // Podkategorie dla kategorii C (Pomiary i regulacje)
        { parent_code: 'C', code: 'C1', name: 'Pomiary temperatury', description: 'Pomiary i regulacja temperatury' },
        { parent_code: 'C', code: 'C2', name: 'Pomiary ciśnienia', description: 'Pomiary i regulacja ciśnienia' },
        { parent_code: 'C', code: 'C3', name: 'Regulacja spalania', description: 'Regulacja parametrów spalania' }
      ];
      
      // Dodaj podkategorie
      for (const subCategory of subCategories) {
        const parentCategory = mainCategories.find(cat => cat.code === subCategory.parent_code);
        if (parentCategory) {
          await this.run(`
            INSERT INTO service_categories (code, name, description, parent_id, sort_order, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
          `, [subCategory.code, subCategory.name, subCategory.description, parentCategory.id, 0]);
        }
      }
      
      console.log('Domyślne kategorie usług zostały dodane');
    } catch (error) {
      console.error('Błąd podczas dodawania domyślnych kategorii usług:', error);
    }
  }

  // Dodanie domyślnych części zamiennych
  async insertDefaultSpareParts() {
    for (const part of DEFAULT_SPARE_PARTS) {
      await this.run(`
        INSERT INTO spare_parts (name, category, part_number, manufacturer, brand, price, stock_quantity, min_stock_level, description, model_compatibility, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [part.name, part.category, part.part_number, part.manufacturer, part.brand, part.price, part.stock, part.min_stock, part.description, part.compatibility]);
    }

    console.log('Dodano domyślne części zamienne');
  }

  async removeDefaultSpareParts() {
    let removed = 0;
    for (const part of DEFAULT_SPARE_PARTS) {
      const row = await this.get(
        `SELECT id FROM spare_parts WHERE part_number = ? AND name = ? AND manufacturer = ?`,
        [part.part_number, part.name, part.manufacturer]
      );
      if (row && row.id) {
        await this.run(`DELETE FROM spare_parts WHERE id = ?`, [row.id]);
        removed += 1;
      }
    }
    if (removed > 0) {
      console.log(`Usunięto domyślne części zamienne (rekordy: ${removed})`);
    }
  }

  // Podstawowe operacje na bazie danych
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Zapytania dla interfejsu
  async query(sql, params = []) {
    return this.all(sql, params);
  }

  // Zamknięcie połączenia
  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async ensureExternalIds(table, column, prefix) {
    try {
      const rows = await this.query(`SELECT id, ${column} FROM ${table}`);
      if (!Array.isArray(rows)) return;
      for (const row of rows) {
        if (!row || row.id == null) continue;
        const current = row[column] ?? row[column?.toLowerCase?.()];
        if (current && String(current).trim() !== '') continue;
        const newValue = `${prefix}${row.id}`;
        try {
          await this.run(`UPDATE ${table} SET ${column} = ? WHERE id = ?`, [newValue, row.id]);
        } catch (e) {
          console.log(`Migration: Failed to set ${column} for ${table}#${row.id}:`, e?.message);
        }
      }
    } catch (error) {
      console.log(`Migration: Unable to inspect table ${table} for ${column}:`, error?.message);
    }
  }

  async ensureExternalIdTrigger(table, column, prefix) {
    try {
      const triggerName = `trg_${table}_${column}_auto`;
      const sql = `
        CREATE TRIGGER IF NOT EXISTS ${triggerName}
        AFTER INSERT ON ${table}
        FOR EACH ROW
        BEGIN
          UPDATE ${table}
          SET ${column} = COALESCE(${column}, '${prefix}' || CAST(NEW.id AS TEXT))
          WHERE id = NEW.id;
        END;
      `;
      await this.run(sql);
    } catch (error) {
      console.log(`Migration: Unable to ensure trigger for ${table}.${column}:`, error?.message);
    }
  }

  getInstallationId() {
    if (this.installationId) return this.installationId;
    try {
      const userDataPath = app.getPath('userData');
      const hash = crypto.createHash('sha1').update(userDataPath).digest('hex');
      this.installationId = `inst-${hash}`;
    } catch (e) {
      console.warn('⚠️ Unable to compute installationId on demand:', e.message);
      this.installationId = 'inst-local-fallback';
    }
    return this.installationId;
  }
}

module.exports = DatabaseService; 