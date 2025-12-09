const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  database: {
    init: () => ipcRenderer.invoke('database-operation', 'init'),
    query: (sql, params) => ipcRenderer.invoke('database-operation', 'query', { sql, params }),
    get: (sql, params) => ipcRenderer.invoke('database-operation', 'get', { sql, params }),
    run: (sql, params) => ipcRenderer.invoke('database-operation', 'run', { sql, params }),

    // Klienci
    getClients: () => ipcRenderer.invoke('database-operation', 'query', { 
      sql: 'SELECT * FROM clients ORDER BY created_at DESC', 
      params: [] 
    }),
    createClient: (clientData) => ipcRenderer.invoke('database-operation', 'run', {
      sql: `INSERT INTO clients (type, first_name, last_name, company_name, nip, regon, email, phone, 
             address_street, address_city, address_postal_code, address_country, notes, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        clientData.type, clientData.first_name, clientData.last_name, clientData.company_name,
        clientData.nip, clientData.regon, clientData.email, clientData.phone,
        clientData.address_street, clientData.address_city, clientData.address_postal_code,
        clientData.address_country, clientData.notes, clientData.is_active
      ]
    }),
    updateClient: (id, clientData) => ipcRenderer.invoke('database-operation', 'run', {
      sql: `UPDATE clients SET type=?, first_name=?, last_name=?, company_name=?, nip=?, regon=?, 
             email=?, phone=?, address_street=?, address_city=?, address_postal_code=?, 
             address_country=?, notes=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      params: [
        clientData.type, clientData.first_name, clientData.last_name, clientData.company_name,
        clientData.nip, clientData.regon, clientData.email, clientData.phone,
        clientData.address_street, clientData.address_city, clientData.address_postal_code,
        clientData.address_country, clientData.notes, clientData.is_active, id
      ]
    }),
    deleteClient: (id) => ipcRenderer.invoke('database-operation', 'run', {
      sql: 'DELETE FROM clients WHERE id = ?',
      params: [id]
    }),

    // Urządzenia
    getDevices: () => ipcRenderer.invoke('database-operation', 'query', { 
      sql: `SELECT d.*, c.first_name, c.last_name, c.company_name, c.type as client_type,
             cat.name as category_name
             FROM devices d
             LEFT JOIN clients c ON d.client_id = c.id
             LEFT JOIN device_categories cat ON d.category_id = cat.id
             ORDER BY d.created_at DESC`, 
      params: [] 
    }),
    getDeviceCategories: () => ipcRenderer.invoke('database-operation', 'query', { 
      sql: 'SELECT * FROM device_categories WHERE is_active = 1 ORDER BY name', 
      params: [] 
    }),
    createDevice: (deviceData) => ipcRenderer.invoke('database-operation', 'run', {
      sql: `INSERT INTO devices (client_id, category_id, name, manufacturer, model, serial_number,
             production_year, power_rating, fuel_type, installation_date, last_service_date,
             next_service_date, warranty_end_date, technical_data, notes, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        deviceData.client_id, deviceData.category_id, deviceData.name, deviceData.manufacturer,
        deviceData.model, deviceData.serial_number, deviceData.production_year,
        deviceData.power_rating, deviceData.fuel_type, deviceData.installation_date,
        deviceData.last_service_date, deviceData.next_service_date, deviceData.warranty_end_date,
        deviceData.technical_data, deviceData.notes, deviceData.is_active
      ]
    }),
    updateDevice: (id, deviceData) => ipcRenderer.invoke('database-operation', 'run', {
      sql: `UPDATE devices SET client_id=?, category_id=?, name=?, manufacturer=?, model=?, 
             serial_number=?, production_year=?, power_rating=?, fuel_type=?, installation_date=?,
             last_service_date=?, next_service_date=?, warranty_end_date=?, technical_data=?,
             notes=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      params: [
        deviceData.client_id, deviceData.category_id, deviceData.name, deviceData.manufacturer,
        deviceData.model, deviceData.serial_number, deviceData.production_year,
        deviceData.power_rating, deviceData.fuel_type, deviceData.installation_date,
        deviceData.last_service_date, deviceData.next_service_date, deviceData.warranty_end_date,
        deviceData.technical_data, deviceData.notes, deviceData.is_active, id
      ]
    }),
    deleteDevice: (id) => ipcRenderer.invoke('database-operation', 'run', {
      sql: 'DELETE FROM devices WHERE id = ?',
      params: [id]
    }),

    // Zlecenia serwisowe
    getServiceOrders: () => ipcRenderer.invoke('database-operation', 'query', { 
      sql: `SELECT so.*, c.first_name, c.last_name, c.company_name, c.type as client_type,
             d.name as device_name, u.full_name as assigned_user_name
             FROM service_orders so
             LEFT JOIN clients c ON so.client_id = c.id
             LEFT JOIN devices d ON so.device_id = d.id
             LEFT JOIN users u ON so.assigned_user_id = u.id
             ORDER BY so.created_at DESC`, 
      params: [] 
    }),
    createServiceOrder: (orderData) => ipcRenderer.invoke('database-operation', 'run', {
      sql: `INSERT INTO service_orders (order_number, client_id, device_id, assigned_user_id, type,
             status, priority, title, description, scheduled_date, estimated_hours, parts_cost,
             labor_cost, total_cost, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        orderData.order_number, orderData.client_id, orderData.device_id, orderData.assigned_user_id,
        orderData.type, orderData.status, orderData.priority, orderData.title, orderData.description,
        orderData.scheduled_date, orderData.estimated_hours, orderData.parts_cost,
        orderData.labor_cost, orderData.total_cost, orderData.notes
      ]
    }),
    updateServiceOrder: (id, orderData) => ipcRenderer.invoke('database-operation', 'run', {
      sql: `UPDATE service_orders SET client_id=?, device_id=?, assigned_user_id=?, type=?, status=?,
             priority=?, title=?, description=?, scheduled_date=?, started_at=?, completed_at=?,
             estimated_hours=?, actual_hours=?, parts_cost=?, labor_cost=?, total_cost=?, notes=?,
             updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      params: [
        orderData.client_id, orderData.device_id, orderData.assigned_user_id, orderData.type,
        orderData.status, orderData.priority, orderData.title, orderData.description,
        orderData.scheduled_date, orderData.started_at, orderData.completed_at,
        orderData.estimated_hours, orderData.actual_hours, orderData.parts_cost,
        orderData.labor_cost, orderData.total_cost, orderData.notes, id
      ]
    }),
    deleteServiceOrder: (id) => ipcRenderer.invoke('database-operation', 'run', {
      sql: 'DELETE FROM service_orders WHERE id = ?',
      params: [id]
    }),

    // Faktury
    getInvoices: () => ipcRenderer.invoke('database-operation', 'query', { 
      sql: `SELECT i.*, c.first_name, c.last_name, c.company_name, c.type as client_type,
             so.order_number
             FROM invoices i
             LEFT JOIN clients c ON i.client_id = c.id
             LEFT JOIN service_orders so ON i.order_id = so.id
             ORDER BY i.created_at DESC`, 
      params: [] 
    }),
    getInvoiceItems: (invoiceId) => ipcRenderer.invoke('database-operation', 'query', { 
      sql: 'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id', 
      params: [invoiceId] 
    }),
    createInvoice: async (invoiceData) => {
      const invoiceResult = await ipcRenderer.invoke('database-operation', 'run', {
        sql: `INSERT INTO invoices (invoice_number, order_id, client_id, issue_date, due_date,
               status, net_amount, tax_amount, gross_amount, payment_method, paid_date, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          invoiceData.invoice_number, invoiceData.order_id, invoiceData.client_id,
          invoiceData.issue_date, invoiceData.due_date, invoiceData.status,
          invoiceData.net_amount, invoiceData.tax_amount, invoiceData.gross_amount,
          invoiceData.payment_method, invoiceData.paid_date, invoiceData.notes
        ]
      });

      // Dodaj pozycje faktury
      if (invoiceData.items && invoiceData.items.length > 0) {
        for (const item of invoiceData.items) {
          await ipcRenderer.invoke('database-operation', 'run', {
            sql: `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price,
                   net_amount, tax_rate, tax_amount, gross_amount)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            params: [
              invoiceResult.id, item.description, item.quantity, item.unit_price,
              item.net_amount, item.tax_rate, item.tax_amount, item.gross_amount
            ]
          });
        }
      }

      return invoiceResult;
    },
    updateInvoice: async (id, invoiceData) => {
      const invoiceResult = await ipcRenderer.invoke('database-operation', 'run', {
        sql: `UPDATE invoices SET order_id=?, client_id=?, issue_date=?, due_date=?, status=?,
               net_amount=?, tax_amount=?, gross_amount=?, payment_method=?, paid_date=?, notes=?,
               updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        params: [
          invoiceData.order_id, invoiceData.client_id, invoiceData.issue_date, invoiceData.due_date,
          invoiceData.status, invoiceData.net_amount, invoiceData.tax_amount, invoiceData.gross_amount,
          invoiceData.payment_method, invoiceData.paid_date, invoiceData.notes, id
        ]
      });

      // Usuń stare pozycje i dodaj nowe
      await ipcRenderer.invoke('database-operation', 'run', {
        sql: 'DELETE FROM invoice_items WHERE invoice_id = ?',
        params: [id]
      });

      if (invoiceData.items && invoiceData.items.length > 0) {
        for (const item of invoiceData.items) {
          await ipcRenderer.invoke('database-operation', 'run', {
            sql: `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price,
                   net_amount, tax_rate, tax_amount, gross_amount)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            params: [
              id, item.description, item.quantity, item.unit_price,
              item.net_amount, item.tax_rate, item.tax_amount, item.gross_amount
            ]
          });
        }
      }

      return invoiceResult;
    },
    deleteInvoice: async (id) => {
      // Usuń pozycje faktury
      await ipcRenderer.invoke('database-operation', 'run', {
        sql: 'DELETE FROM invoice_items WHERE invoice_id = ?',
        params: [id]
      });

      // Usuń fakturę
      return await ipcRenderer.invoke('database-operation', 'run', {
        sql: 'DELETE FROM invoices WHERE id = ?',
        params: [id]
      });
    }
  },

  // Password verification
  verifyPassword: (password, hash) => ipcRenderer.invoke('verify-password', password, hash),

  // File management API
  fileManager: {
    // Wybór plików z systemu
    selectFiles: (options) => ipcRenderer.invoke('select-files', options),
    
    // Zapisanie pliku dla urządzenia
    saveDeviceFile: (deviceId, filePath, fileData) => 
      ipcRenderer.invoke('save-device-file', deviceId, filePath, fileData),
    
    // Usunięcie pliku
    deleteFile: (filePath) => ipcRenderer.invoke('delete-device-file', filePath),
    
    // Pobranie pliku jako base64
    getFile: (filePath) => ipcRenderer.invoke('get-device-file', filePath),
    
    // Otwórz plik w domyślnej aplikacji
    openFile: (filePath) => ipcRenderer.invoke('open-device-file', filePath),
    
    // API bazy danych dla plików urządzeń
    getDeviceFiles: (deviceId) => ipcRenderer.invoke('database-operation', 'query', {
      sql: 'SELECT * FROM device_files WHERE device_id = ? ORDER BY is_primary DESC, created_at DESC',
      params: [deviceId]
    }),
    
    addDeviceFile: (fileData) => ipcRenderer.invoke('database-operation', 'run', {
      sql: `INSERT INTO device_files (device_id, file_name, file_path, file_type, file_category, 
             file_size, mime_type, title, description, is_primary) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        fileData.device_id, fileData.file_name, fileData.file_path, fileData.file_type,
        fileData.file_category, fileData.file_size, fileData.mime_type, fileData.title,
        fileData.description, fileData.is_primary || 0
      ]
    }),
    
    updateDeviceFile: (id, fileData) => ipcRenderer.invoke('database-operation', 'run', {
      sql: `UPDATE device_files SET title = ?, description = ?, file_category = ?, 
             is_primary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params: [fileData.title, fileData.description, fileData.file_category, fileData.is_primary || 0, id]
    }),
    
    deleteDeviceFile: (id) => ipcRenderer.invoke('database-operation', 'run', {
      sql: 'DELETE FROM device_files WHERE id = ?',
      params: [id]
    }),
    
    setPrimaryFile: (deviceId, fileId) => ipcRenderer.invoke('database-operation', 'run', {
      sql: `UPDATE device_files SET is_primary = 
             CASE WHEN id = ? THEN 1 ELSE 0 END 
             WHERE device_id = ?`,
      params: [fileId, deviceId]
    })
  },

  // Menu actions listener
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
  
  // Remove menu action listener
  removeMenuActionListener: () => ipcRenderer.removeAllListeners('menu-action'),

  // File operations (legacy - pozostawione dla kompatybilności)
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFile: (data, filename) => ipcRenderer.invoke('save-file', data, filename),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // User management API
  users: {
    getAllUsers: async () => {
      const result = await ipcRenderer.invoke('users-get-all');
      return result.success ? result.data : [];
    },
    
    createUser: async (userData) => {
      const result = await ipcRenderer.invoke('users-create', userData);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    
    updateUser: async (userId, userData) => {
      const result = await ipcRenderer.invoke('users-update', userId, userData);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    
    deleteUser: async (userId) => {
      const result = await ipcRenderer.invoke('users-delete', userId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    getUserPin: async (userId) => {
      const result = await ipcRenderer.invoke('users-get-pin', userId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    }
  },

  // Backup API
  backup: {
    createBackup: async () => {
      const result = await ipcRenderer.invoke('backup-create');
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.path;
    },
    
    getBackupList: async () => {
      const result = await ipcRenderer.invoke('backup-list');
      return result.success ? result.data : [];
    },
    
    restoreBackup: async (backupPath) => {
      const result = await ipcRenderer.invoke('backup-restore', backupPath);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    
    deleteBackup: async (backupId) => {
      const result = await ipcRenderer.invoke('backup-delete', backupId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },

    downloadBackup: async (backupPath, backupName) => {
      const result = await ipcRenderer.invoke('backup-download', backupPath, backupName);
      if (!result.success && !result.canceled) {
        throw new Error(result.error);
      }
      return result;
    },
    
    selectBackupFile: () => {
      return ipcRenderer.invoke('select-files', {
        title: 'Wybierz plik kopii zapasowej',
        filters: [
          { name: 'Pliki bazy danych', extensions: ['db'] },
          { name: 'Wszystkie pliki', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
    }
  },

  settings: {
    saveCompany: (data) => ipcRenderer.invoke('to-railway', {
      method: 'PUT',
      path: '/company',
      body: data
    }),
    getCompany: () => ipcRenderer.invoke('to-railway', {
      method: 'GET',
      path: '/company'
    }),
    saveProfile: async (profile) => {},
    saveSystemConfig: async (config) => {},
    getSettings: async () => ({})
  },

  // Reports API
  reports: {
    generatePDF: async (html, defaultFileName) => {
      const result = await ipcRenderer.invoke('reports-generate-pdf', { html, defaultFileName });
      if (!result.success) {
        if (result.canceled) return null;
        throw new Error(result.error || 'Nie udało się wygenerować PDF');
      }
      return result.path;
    }
  },

  diagnostics: {
    runRailwayCheck: async (entity) => {
      const result = await ipcRenderer.invoke('diagnostics-railway', entity);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    export: async () => {
      throw new Error('NOT_IMPLEMENTED');
    }
  },

  protocols: {
    ensureFolder: () => ipcRenderer.invoke('protocols-ensure-folder'),
    exportToRailway: (protocolId) => ipcRenderer.invoke('protocols-export', protocolId),
    openPdf: (filePath) => ipcRenderer.invoke('protocols-open-pdf', filePath),
    generatePdf: (payload) => ipcRenderer.invoke('protocols-generate-pdf', payload)
  },

  workCards: {
    generatePdf: (payload) => ipcRenderer.invoke('workcards-generate-pdf', payload)
  },
 
  // Security API (placeholder for future implementation)
  security: {
    saveConfig: async (config) => {
      // Placeholder - implement when security features are added
      console.log('Security config saved:', config);
      return true;
    },
    
    openLogsViewer: () => {
      // Placeholder - implement when logging is added
      console.log('Opening logs viewer...');
    },
    
    getActiveSessions: async () => {
      // Placeholder - return mock data for now
      return [
        {
          id: 1,
          username: 'admin',
          ip_address: '127.0.0.1',
          last_activity: new Date().toISOString()
        }
      ];
    },
    
    terminateSession: async (sessionId) => {
      // Placeholder - implement when session management is added
      console.log('Terminating session:', sessionId);
      return true;
    }
  }
}); 