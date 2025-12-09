const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');
const railwayDb = require('../../railway-backend/database/connection');
// Prefer Node 18+ global fetch, fallback to node-fetch when missing
const ensureFetch = async () => {
  if (typeof fetch === 'function') {
    return fetch;
  }
  const mod = await import('node-fetch');
  return mod.default;
};
// Sprawdź czy jest tryb dev (na podstawie istnienia serwera Vite lub NODE_ENV)
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev') || !app.isPackaged;
const LOCAL_API_BASE = (process.env.DESKTOP_API_BASE || 'http://127.0.0.1:5174').replace(/\/$/, '');

const sanitizeFileName = (name = '') => {
  return String(name)
    .trim()
    .replace(/[^a-zA-Z0-9.\-_]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    || `protokol_${Date.now()}.pdf`;
};

// Keep a global reference of the window object
let mainWindow;
let databaseService;
let apiServer;
// ======= BAZA_ZDJEC (lokalne, trwałe archiwum plików) =======
// Domyślna ścieżka na Windows; można nadpisać przez ENV BAZA_ZDJEC_DIR
const getBazaZdjecBase = () => {
  const envPath = process.env.BAZA_ZDJEC_DIR;
  if (envPath && typeof envPath === 'string' && envPath.trim()) return envPath.trim();
  // Domyślnie wg uzgodnień
  return process.platform === 'win32'
    ? 'C://programy//serwis//BAZA_ZDJEC'
    : path.join(app.getPath('documents'), 'Serwis', 'BAZA_ZDJEC');
};

function isImageMime(mime) {
  const m = String(mime || '').toLowerCase();
  return m.startsWith('image/') || m.includes('jpeg') || m.includes('png') || m.includes('webp') || m.includes('gif') || m.includes('bmp');
}

async function ensureDirSyncSafe(p) {
  try { await fs.access(p); } catch { await fs.mkdir(p, { recursive: true }); }
}

async function copyToBazaZdjec(deviceId, originalName, absoluteSourcePath, mimeType) {
  try {
    if (!deviceId || !absoluteSourcePath) return null;
    const base = getBazaZdjecBase();
    // Zgodnie z wymaganiem: PDF trzymamy razem ze zdjęciami (w photos)
    const isPdf = String(mimeType || '').toLowerCase() === 'application/pdf' || String(originalName || '').toLowerCase().endsWith('.pdf');
    const deviceDir = path.join(base, `device-${deviceId}`, (isImageMime(mimeType) || isPdf) ? 'photos' : 'docs');
    await ensureDirSyncSafe(deviceDir);
    // Zachowaj oryginalną nazwę – w razie konfliktu dopnij sufiks czasowy
    const nameSafe = originalName || path.basename(absoluteSourcePath);
    let target = path.join(deviceDir, nameSafe);
    if (fsSync.existsSync(target)) {
      const ext = path.extname(nameSafe);
      const stem = path.basename(nameSafe, ext);
      target = path.join(deviceDir, `${stem}-${Date.now()}${ext}`);
    }
    await fs.copyFile(absoluteSourcePath, target);
    return target;
  } catch (e) {
    console.warn('BAZA_ZDJEC copy skipped:', e?.message);
    return null;
  }
}

// Prosta pamięć świeżych uploadów, aby nie dublować (60s)
const recentlyUploaded = new Map(); // key -> timestamp
function makeRUKey(deviceId, fileName, size) { return `${deviceId}|${fileName}|${size}`; }
function gcRecentlyUploaded() {
  const now = Date.now();
  for (const [k, t] of recentlyUploaded.entries()) { if (now - t > 60_000) recentlyUploaded.delete(k); }
}

async function uploadOneFileToRailway(deviceId, filePathAbs, fileName, mimeType, fileType) {
  try {
    if (!deviceId || !filePathAbs || !fsSync.existsSync(filePathAbs)) return false;
    const buf = fsSync.readFileSync(filePathAbs);
    const key = makeRUKey(deviceId, fileName || path.basename(filePathAbs), buf.length);
    gcRecentlyUploaded();
    if (recentlyUploaded.has(key)) return false; // świeży duplikat – pomiń
    const contentBase64 = buf.toString('base64');
    const url = `http://127.0.0.1:5174/api/railway/device-files/upload`;
    const payload = { deviceId, filePath: filePathAbs, fileName: fileName || path.basename(filePathAbs), mimeType: mimeType || null, fileType: fileType || (isImageMime(mimeType) ? 'image' : 'document') };
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(()=>null);
    const ok = !!(r && r.ok);
    if (ok) recentlyUploaded.set(key, Date.now());
    return ok;
  } catch (_) { return false; }
}

async function scanAndSyncBazaZdjec() {
  try {
    const base = getBazaZdjecBase();
    if (!fsSync.existsSync(base)) return { scanned: 0, uploaded: 0 };
    let scanned = 0, uploaded = 0;
    const devices = fsSync.readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory() && /^device-\d+$/i.test(d.name));
    for (const d of devices) {
      const deviceId = parseInt(d.name.split('-')[1]);
      if (!deviceId) continue;
      for (const sub of ['photos', 'docs']) {
        const dir = path.join(base, d.name, sub);
        if (!fsSync.existsSync(dir)) continue;
        const files = fsSync.readdirSync(dir, { withFileTypes: true }).filter(f => f.isFile());
        for (const f of files) {
          scanned++;
          const full = path.join(dir, f.name);
          const lower = f.name.toLowerCase();
          const mime = lower.endsWith('.png') ? 'image/png'
            : lower.endsWith('.webp') ? 'image/webp'
            : (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) ? 'image/jpeg'
            : lower.endsWith('.pdf') ? 'application/pdf'
            : 'application/octet-stream';
          // Throttling: omiń świeże pliki (mtime < 60s), bo i tak wysłane natychmiast podczas dodawania
          try {
            const st = fsSync.statSync(full);
            if (Date.now() - st.mtimeMs < 60_000) continue;
          } catch (_) {}
          const fileType = isImageMime(mime) ? 'image' : (mime === 'application/pdf' ? 'document' : 'other');
          const ok = await uploadOneFileToRailway(deviceId, full, f.name, mime, fileType);
          if (ok) uploaded++;
        }
      }
    }
    console.log(`🗂️ BAZA_ZDJEC sync: scanned=${scanned}, uploaded=${uploaded}`);
    return { scanned, uploaded };
  } catch (e) {
    console.warn('BAZA_ZDJEC sync error:', e?.message);
    return { scanned: 0, uploaded: 0 };
  }
}


// --- PIN encryption helpers (AES-256-GCM) ---
const ENC_DIR = () => path.join(app.getPath('userData'), 'secrets');
const ENC_KEY_PATH = () => path.join(ENC_DIR(), 'pin-key.bin');

async function ensureEncryptionKey() {
  try {
    await fs.access(ENC_KEY_PATH());
    const key = await fs.readFile(ENC_KEY_PATH());
    if (key && key.length === 32) return key;
  } catch (_) {}
  const key = crypto.randomBytes(32);
  await fs.mkdir(ENC_DIR(), { recursive: true });
  await fs.writeFile(ENC_KEY_PATH(), key);
  return key;
}

async function encryptPin(plainPin) {
  const key = await ensureEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plainPin), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

async function decryptPin(encryptedBase64) {
  if (!encryptedBase64) return null;
  const key = await ensureEncryptionKey();
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const enc = data.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

async function initializeDatabase() {
  const DatabaseService = require('./database');
  databaseService = new DatabaseService();
  
  try {
    await databaseService.initialize();
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    databaseService = null; // Reset to null if initialization failed
    return false;
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    titleBarStyle: 'default',
    frame: true
  });

  // Load the app
  if (isDev) {
    const devUrl = 'http://localhost:5173';
    console.log('🔥 ELECTRON: Loading dev URL:', devUrl);
    
    mainWindow.loadURL(devUrl).catch(err => {
      console.error('❌ ELECTRON: Failed to load URL:', err);
    });
    
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    
    // Debug - sprawdź czy strona się załadowała
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('🔥 ELECTRON: Page loaded successfully');
    });
    
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('❌ ELECTRON: Failed to load page:', errorCode, errorDescription, validatedURL);
    });
    
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'Plik',
      submenu: [
        {
          label: 'Nowy klient',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-action', 'new-client');
          }
        },
        {
          label: 'Nowe zlecenie',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            mainWindow.webContents.send('menu-action', 'new-order');
          }
        },
        { type: 'separator' },
        {
          label: 'Eksport danych',
          click: () => {
            mainWindow.webContents.send('menu-action', 'export-data');
          }
        },
        {
          label: 'Import danych',
          click: () => {
            mainWindow.webContents.send('menu-action', 'import-data');
          }
        },
        { type: 'separator' },
        {
          label: 'Wyjście',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Widok',
      submenu: [
        { role: 'reload', label: 'Odśwież' },
        { role: 'forceReload', label: 'Wymuś odświeżenie' },
        { role: 'toggleDevTools', label: 'Narzędzia deweloperskie' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Resetuj zoom' },
        { role: 'zoomIn', label: 'Powiększ' },
        { role: 'zoomOut', label: 'Pomniejsz' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pełny ekran' }
      ]
    },
    {
      label: 'Pomoc',
      submenu: [
        {
          label: 'O programie',
          click: () => {
            mainWindow.webContents.send('menu-action', 'about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  const isDbInitialized = await initializeDatabase();
  if (isDbInitialized) {
    createWindow();
    
    // Uruchom API server dla komunikacji mobilnej
    try {
      const APIServer = require('./api-server');
      apiServer = new APIServer(databaseService);
      await apiServer.start(5174); // Port 5174 dla API
      console.log('🌐 API Server dla aplikacji mobilnej uruchomiony');
    } catch (error) {
      console.error('❌ Błąd uruchamiania API servera:', error);
    }
    
    // Uruchom automatyczne kopie zapasowe
    console.log('🚀 Uruchamianie systemu automatycznych kopii zapasowych...');
    scheduleAutoBackup();

    // Lekki, bezpieczny sync BAZA_ZDJEC → Railway (best-effort)
    try {
      setTimeout(() => {
        scanAndSyncBazaZdjec().then((s) => console.log('🔁 BAZA_ZDJEC pierwsza synchronizacja:', s)).catch(()=>{});
      }, 15000);
      // Co 24h powtórka
      setInterval(() => {
        scanAndSyncBazaZdjec().then((s) => console.log('🔁 BAZA_ZDJEC cykliczna synchronizacja:', s)).catch(()=>{});
      }, 24 * 60 * 60 * 1000);
    } catch (_) { /* ignore */ }
  } else {
    console.error('Database initialization failed. Exiting application.');
    app.quit();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup na zamknięcie aplikacji
app.on('before-quit', () => {
  if (apiServer) {
    apiServer.stop();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

// IPC handlers for database operations
ipcMain.handle('database-operation', async (event, operation, data) => {
  try {
    if (!databaseService) {
      throw new Error('Database service not initialized');
    }
    
    switch (operation) {
      case 'init':
        return await databaseService.initialize();
      case 'query':
        return await databaseService.query(data.sql, data.params);
      case 'get':
        return await databaseService.get(data.sql, data.params);
      case 'run':
        return await databaseService.run(data.sql, data.params);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error('Database operation error:', error);
    throw error;
  }
});

// Password verification handler
ipcMain.handle('verify-password', async (event, password, hash) => {
  const bcrypt = require('bcryptjs');
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
});

// File management handlers
const getFilesDirectory = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'device-files');
};

const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

// Handler dla wyboru plików
ipcMain.handle('select-files', async (event, options = {}) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Wybierz pliki',
      filters: [
        { name: 'Obrazy', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
        { name: 'Dokumenty PDF', extensions: ['pdf'] },
        { name: 'Dokumenty', extensions: ['doc', 'docx', 'txt', 'rtf'] },
        { name: 'Wszystkie pliki', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections'],
      ...options
    });

    if (result.canceled) {
      return { success: false, files: [] };
    }

    return { success: true, files: result.filePaths };
  } catch (error) {
    console.error('Error selecting files:', error);
    return { success: false, error: error.message };
  }
});

// Handler do zapisywania pliku
ipcMain.handle('save-device-file', async (event, deviceId, filePath, fileData) => {
  try {
    const filesDir = getFilesDirectory();
    await ensureDirectoryExists(filesDir);
    
    // Utwórz katalog dla urządzenia
    const deviceDir = path.join(filesDir, `device-${deviceId}`);
    await ensureDirectoryExists(deviceDir);
    
    // Generuj unikalną nazwę pliku
    const originalName = path.basename(filePath);
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    const timestamp = Date.now();
    const uniqueName = `${nameWithoutExt}-${timestamp}${extension}`;
    
    const targetPath = path.join(deviceDir, uniqueName);
    
    // Skopiuj plik
    if (fileData) {
      // Dane base64
      const buffer = Buffer.from(fileData, 'base64');
      await fs.writeFile(targetPath, buffer);
    } else {
      // Ścieżka do pliku
      await fs.copyFile(filePath, targetPath);
    }
  
  // Kopia do BAZA_ZDJEC i best-effort upload do Railway (nie blokuje głównego zapisu)
  try {
    const mimeForCopy = getMimeType(extension);
    await copyToBazaZdjec(deviceId, originalName, targetPath, mimeForCopy);
    uploadOneFileToRailway(deviceId, targetPath, uniqueName, mimeForCopy, isImageMime(mimeForCopy) ? 'image' : 'document').catch(()=>{});
  } catch (_) { /* ignore */ }
    
    // Pobierz informacje o pliku
    const stats = await fs.stat(targetPath);
    const mime = getMimeType(extension);
    
    return {
      success: true,
      file: {
        file_name: uniqueName,
        file_path: targetPath,
        file_size: stats.size,
        mime_type: mime,
        original_name: originalName
      }
    };
  } catch (error) {
    console.error('Error saving device file:', error);
    return { success: false, error: error.message };
  }
});

// Handler do usuwania pliku
ipcMain.handle('delete-device-file', async (event, filePath) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }
});

// Handler do pobierania pliku (zwraca base64)
ipcMain.handle('get-device-file', async (event, filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    const base64 = buffer.toString('base64');
    const mime = getMimeType(path.extname(filePath));
    
    return {
      success: true,
      data: base64,
      mimeType: mime
    };
  } catch (error) {
    console.error('Error reading file:', error);
    return { success: false, error: error.message };
  }
});

// Handler do otwierania pliku w domyślnej aplikacji
ipcMain.handle('open-device-file', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    console.error('Error opening file:', error);
    return { success: false, error: error.message };
  }
});

// Pomocnicza funkcja do określania MIME type
const getMimeType = (extension) => {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
};

// API zarządzania użytkownikami
ipcMain.handle('users-get-all', async (event) => {
  try {
    if (!databaseService) {
      return { success: false, error: 'Database not initialized' };
    }
    const users = await databaseService.all('SELECT * FROM users ORDER BY created_at ASC');
    return { success: true, data: users };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users-create', async (event, userData) => {
  try {
    if (!databaseService) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const bcrypt = require('bcryptjs');
    
    // Sprawdź czy użytkownik już istnieje
    const existingUser = await databaseService.get('SELECT id FROM users WHERE username = ?', [userData.username]);
    if (existingUser) {
      throw new Error('Użytkownik o takiej nazwie już istnieje');
    }
    
    // Hashuj hasło
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    // Przygotuj PIN (opcjonalnie)
    let pinHash = null;
    let pinEncrypted = null;
    if (userData.mobile_pin && /^\d{4,8}$/.test(String(userData.mobile_pin))) {
      pinHash = await bcrypt.hash(String(userData.mobile_pin), 10);
      pinEncrypted = await encryptPin(String(userData.mobile_pin));
    }

    const result = await databaseService.run(
      'INSERT INTO users (username, password_hash, full_name, email, phone, role, is_active, mobile_pin_hash, mobile_pin_encrypted, mobile_authorized) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userData.username, hashedPassword, userData.full_name, userData.email, userData.phone || null, userData.role, userData.is_active ? 1 : 0, pinHash, pinEncrypted, userData.mobile_authorized ? 1 : 0]
    );
    
    return { success: true, data: { id: result.lastID } };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users-update', async (event, userId, userData) => {
  try {
    if (!databaseService) {
      return { success: false, error: 'Database not initialized' };
    }
    
    const updateFields = [];
    const values = [];
    
    if (userData.full_name !== undefined) {
      updateFields.push('full_name = ?');
      values.push(userData.full_name);
    }
    
    if (userData.email !== undefined) {
      updateFields.push('email = ?');
      values.push(userData.email);
    }
    if (userData.phone !== undefined) {
      updateFields.push('phone = ?');
      values.push(userData.phone);
    }
    
    if (userData.role !== undefined) {
      updateFields.push('role = ?');
      values.push(userData.role);
    }
    
    if (userData.mobile_authorized !== undefined) {
      updateFields.push('mobile_authorized = ?');
      values.push(userData.mobile_authorized ? 1 : 0);
    }

    if (userData.is_active !== undefined) {
      updateFields.push('is_active = ?');
      values.push(userData.is_active ? 1 : 0);
    }
    
    if (userData.password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      updateFields.push('password_hash = ?');
      values.push(hashedPassword);
    }
    if (userData.mobile_pin) {
      const bcrypt = require('bcryptjs');
      const pin = String(userData.mobile_pin);
      if (/^\d{4,8}$/.test(pin)) {
        const pinHash = await bcrypt.hash(pin, 10);
        updateFields.push('mobile_pin_hash = ?');
        values.push(pinHash);
        // store encrypted PIN locally for admin preview
        const pinEncrypted = await encryptPin(pin);
        updateFields.push('mobile_pin_encrypted = ?');
        values.push(pinEncrypted);
      }
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);
    
    await databaseService.run(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
});

// IPC: get user PIN (admin-only UI should gate this)
ipcMain.handle('users-get-pin', async (event, userId) => {
  try {
    if (!databaseService) {
      return { success: false, error: 'Database not initialized' };
    }
    const row = await databaseService.get('SELECT mobile_pin_encrypted FROM users WHERE id = ?', [userId]);
    if (!row || !row.mobile_pin_encrypted) return { success: true, data: null };
    const pin = await decryptPin(row.mobile_pin_encrypted).catch(() => null);
    return { success: true, data: pin };
  } catch (error) {
    console.error('Error getting user PIN:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users-delete', async (event, userId) => {
  try {
    if (!databaseService) {
      return { success: false, error: 'Database not initialized' };
    }
    await databaseService.run('DELETE FROM users WHERE id = ?', [userId]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }
});

// API backup
ipcMain.handle('backup-create', async (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'serwis.db');
    const backupDir = path.join(userDataPath, 'backups');
    
    // Utwórz katalog backup jeśli nie istnieje
    await ensureDirectoryExists(backupDir);
    
    // Nazwa pliku backup z datą
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
    const dateStr = timestamp[0];
    const timeStr = timestamp[1].split('.')[0];
    const backupFileName = `backup_${dateStr}_${timeStr}.db`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Skopiuj bazę danych
    await fs.copyFile(dbPath, backupPath);
    
    return { success: true, path: backupPath, filename: backupFileName };
  } catch (error) {
    console.error('Error creating backup:', error);
    return { success: false, error: error.message };
  }
});

// Reports: generate PDF from provided HTML
ipcMain.handle('reports-generate-pdf', async (event, payload) => {
  try {
    const { html, defaultFileName } = payload || {};
    // Ask user where to save
    const userDocuments = app.getPath('documents');
    const defaultPath = require('path').join(userDocuments, 'Serwis', 'Raporty');
    await ensureDirectoryExists(defaultPath);

    const saveDialog = await dialog.showSaveDialog(mainWindow, {
      title: 'Zapisz raport PDF',
      defaultPath: require('path').join(defaultPath, defaultFileName || 'raport.pdf'),
      filters: [{ name: 'Dokumenty PDF', extensions: ['pdf'] }]
    });
    if (saveDialog.canceled) {
      return { success: false, canceled: true };
    }

    // Create offscreen window to render HTML
    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true
      }
    });

    const dataUrl = 'data:text/html;charset=UTF-8,' + encodeURIComponent(html || '<html><body><h1>Raport</h1></body></html>');
    await pdfWindow.loadURL(dataUrl);

    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4',
      margins: { marginType: 'default' }
    });

    await fs.writeFile(saveDialog.filePath, pdfBuffer);
    pdfWindow.destroy();

    return { success: true, path: saveDialog.filePath };
  } catch (error) {
    console.error('Error generating report PDF:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('protocols-ensure-folder', async () => {
  try {
    const baseDir = path.join(app.getPath('documents'), 'Serwis', 'Protokoly');
    await ensureDirectoryExists(baseDir);
    return { success: true, path: baseDir };
  } catch (error) {
    console.error('protocols-ensure-folder error:', error);
    return { success: false, error: error?.message || 'ensure-folder-failed' };
  }
});

ipcMain.handle('protocols-export', async (_event, protocolId) => {
  try {
    if (!protocolId) throw new Error('protocolId required');
    const fetchImpl = await ensureFetch();
    const response = await fetchImpl(`${LOCAL_API_BASE}/api/railway/export-protocol/${protocolId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success !== true) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }
    return { success: true, data: data?.data || null };
  } catch (error) {
    console.error('protocols-export error:', error);
    return { success: false, error: error?.message || 'protocol-export-failed' };
  }
});

ipcMain.handle('protocols-open-pdf', async (_event, filePathToOpen) => {
  try {
    if (!filePathToOpen) throw new Error('filePath required');
    const result = await shell.openPath(filePathToOpen);
    if (result) throw new Error(result);
    return { success: true };
  } catch (error) {
    console.error('protocols-open-pdf error:', error);
    return { success: false, error: error?.message || 'open-pdf-failed' };
  }
});

ipcMain.handle('workcards-generate-pdf', async (_event, payload = {}) => {
  try {
    const { html, fileName } = payload;
    if (!html) throw new Error('html required');
    const baseDir = path.join(app.getPath('documents'), 'Serwis', 'KartyPracy');
    await ensureDirectoryExists(baseDir);
    const safeName = sanitizeFileName(fileName || `karta_pracy_${Date.now()}.pdf`);
    const targetPath = path.join(baseDir, safeName);

    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true
      }
    });

    try {
      const dataUrl = 'data:text/html;charset=UTF-8,' + encodeURIComponent(html);
      await pdfWindow.loadURL(dataUrl);

      const pdfBuffer = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        landscape: false,
        pageSize: 'A4',
        margins: { marginType: 'default' }
      });

      await fs.writeFile(targetPath, pdfBuffer);
    } finally {
      pdfWindow.destroy();
    }

    return { success: true, path: targetPath, fileName: safeName };
  } catch (error) {
    console.error('workcards-generate-pdf error:', error);
    return { success: false, error: error?.message || 'workcard-pdf-failed' };
  }
});

ipcMain.handle('protocols-generate-pdf', async (_event, payload = {}) => {
  try {
    const { protocolId, html, fileName } = payload;
    if (!protocolId) throw new Error('protocolId required');
    const baseDir = path.join(app.getPath('documents'), 'Serwis', 'Protokoly');
    await ensureDirectoryExists(baseDir);
    const safeName = sanitizeFileName(fileName || `protokol_${protocolId}_${Date.now()}.pdf`);
    const targetPath = path.join(baseDir, safeName);

    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true
      }
    });

    const dataUrl = 'data:text/html;charset=UTF-8,' + encodeURIComponent(html || '<html><body><h1>Protokół serwisowy</h1></body></html>');
    await pdfWindow.loadURL(dataUrl);

    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4',
      margins: { marginType: 'default' }
    });

    await fs.writeFile(targetPath, pdfBuffer);
    pdfWindow.destroy();

    try {
      const fetchImpl = await ensureFetch();
      await fetchImpl(`${LOCAL_API_BASE}/api/protocols/${protocolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfFilename: safeName,
          localPdfPath: targetPath,
          pdfUploaded: false,
          desktopSyncStatus: 'pending',
          touchSync: false
        })
      }).catch(() => null);
    } catch (err) {
      console.warn('protocols-generate-pdf sync failed:', err?.message || err);
    }

    return { success: true, path: targetPath, fileName: safeName };
  } catch (error) {
    console.error('protocols-generate-pdf error:', error);
    return { success: false, error: error?.message || 'protocol-pdf-failed' };
  }
});

ipcMain.handle('backup-list', async (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const backupDir = path.join(userDataPath, 'backups');
    
    try {
      const files = await fs.readdir(backupDir);
      const backups = [];
      
      for (const file of files) {
        if (file.endsWith('.db')) {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          
          backups.push({
            id: file,
            name: file,
            path: filePath,
            date: stats.mtime.toLocaleString('pl-PL'),
            size: formatFileSize(stats.size)
          });
        }
      }
      
      // Sortuj od najnowszych
      backups.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return { success: true, data: backups };
    } catch (dirError) {
      // Katalog nie istnieje
      return { success: true, data: [] };
    }
  } catch (error) {
    console.error('Error listing backups:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup-restore', async (event, backupPath) => {
  try {
    const userDataPath = app.getPath('userData');
    const currentDbPath = path.join(userDataPath, 'serwis.db');
    
    // Utwórz backup bieżącej bazy przed przywróceniem
    const emergencyBackupPath = path.join(userDataPath, 'emergency-backup-before-restore.db');
    await fs.copyFile(currentDbPath, emergencyBackupPath);
    
    // Przywróć bazę z backup
    await fs.copyFile(backupPath, currentDbPath);
    
    // Reinicjalizuj bazę danych
    await databaseService.connect(currentDbPath);
    
    return { success: true };
  } catch (error) {
    console.error('Error restoring backup:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup-delete', async (event, backupId) => {
  try {
    const userDataPath = app.getPath('userData');
    const backupDir = path.join(userDataPath, 'backups');
    if (!backupId || typeof backupId !== 'string') {
      throw new Error('Invalid backup id');
    }
    const targetPath = path.join(backupDir, backupId);
    const normalizedTarget = path.normalize(targetPath);
    const normalizedDir = path.normalize(backupDir + path.sep);
    if (!normalizedTarget.startsWith(normalizedDir)) {
      throw new Error('Invalid backup path');
    }
    await fs.unlink(normalizedTarget);
    return { success: true };
  } catch (error) {
    console.error('Backup delete error:', error);
    return { success: false, error: error?.message || 'Backup delete failed' };
  }
});

ipcMain.handle('backup-download', async (event, backupPath, backupName) => {
  try {
    if (!backupPath || typeof backupPath !== 'string') {
      throw new Error('Invalid backup path');
    }
    const userDataPath = app.getPath('userData');
    const backupDir = path.join(userDataPath, 'backups');
    const normalizedSource = path.normalize(backupPath);
    const normalizedDir = path.normalize(backupDir + path.sep);
    if (!normalizedSource.startsWith(normalizedDir)) {
      throw new Error('Backup outside allowed directory');
    }
    let fileExists = false;
    try {
      await fs.access(normalizedSource);
      fileExists = true;
    } catch (_) {
      fileExists = false;
    }
    if (!fileExists) {
      throw new Error('Backup file not found');
    }
    const defaultName = backupName && typeof backupName === 'string' ? backupName : path.basename(normalizedSource);
    const documentsPath = app.getPath('documents');
    const dialogResult = await dialog.showSaveDialog(mainWindow, {
      title: 'Zapisz kopię zapasową',
      defaultPath: path.join(documentsPath, defaultName),
      filters: [{ name: 'Pliki bazy danych', extensions: ['db'] }, { name: 'Wszystkie pliki', extensions: ['*'] }]
    });
    if (dialogResult.canceled || !dialogResult.filePath) {
      return { success: false, canceled: true };
    }
    await fs.copyFile(normalizedSource, dialogResult.filePath);
    return { success: true, path: dialogResult.filePath };
  } catch (error) {
    console.error('Backup download error:', error);
    return { success: false, error: error?.message || 'Backup download failed' };
  }
});

const sanitizePhone = (value) => {
  if (!value) return '';
  return String(value).replace(/\D+/g, '');
};

const normalizeDiagnosticValue = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? Number(value) : null;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const createPickFunction = (fields) => (row) => {
  if (!row) return null;
  const picked = {};
  for (const field of fields) {
    picked[field] = row[field] ?? null;
  }
  return picked;
};

const buildDiagnosticsReport = (kind, localRows, railwayRows, options) => {
  const { getKey, fields, describe, pick } = options;
  const localMap = new Map();
  const railwayMap = new Map();

  for (const row of localRows) {
    const key = getKey(row);
    if (!key) continue;
    if (!localMap.has(key)) {
      localMap.set(key, row);
    }
  }

  for (const row of railwayRows) {
    const key = getKey(row);
    if (!key) continue;
    const arr = railwayMap.get(key) || [];
    arr.push(row);
    railwayMap.set(key, arr);
  }

  const duplicates = [];
  const mismatches = [];
  const onlyDesktop = [];
  const onlyRailway = [];

  const allKeys = new Set([...localMap.keys(), ...railwayMap.keys()]);
  for (const key of allKeys) {
    const localRow = localMap.get(key) || null;
    const remoteList = railwayMap.get(key) || [];

    if (!localRow && remoteList.length > 0) {
      if (remoteList.length > 1) {
        duplicates.push({
          key,
          items: remoteList.map((r) => ({ id: r.id, summary: describe(r) }))
        });
      }
      remoteList.forEach((r) => {
        onlyRailway.push({
          key,
          id: r.id,
          summary: describe(r)
        });
      });
      continue;
    }

    if (localRow && remoteList.length === 0) {
      onlyDesktop.push({
        key,
        id: localRow.id,
        summary: describe(localRow)
      });
      continue;
    }

    if (remoteList.length > 1) {
      duplicates.push({
        key,
        items: remoteList.map((r) => ({ id: r.id, summary: describe(r) }))
      });
    }

    const remoteRow = remoteList[0];
    const differences = [];
    for (const field of fields) {
      const localVal = normalizeDiagnosticValue(localRow[field]);
      const remoteVal = normalizeDiagnosticValue(remoteRow[field]);
      if (localVal !== remoteVal) {
        differences.push({
          field,
          desktop: localVal,
          railway: remoteVal
        });
      }
    }
    if (differences.length > 0) {
      mismatches.push({
        key,
        local: pick(localRow),
        railway: pick(remoteRow),
        differences
      });
    }
  }

  return {
    kind,
    timestamp: new Date().toISOString(),
    totals: {
      desktop: localRows.length,
      railway: railwayRows.length
    },
    duplicates,
    mismatches,
    onlyDesktop,
    onlyRailway
  };
};

const collectRailwayDiagnostics = async (kind) => {
  if (!databaseService) throw new Error('Database not initialized');
  if (!railwayDb.isReady()) {
    const reason = railwayDb.getInitError() || 'Railway connection disabled';
    throw new Error(`Railway diagnostics unavailable: ${reason}`);
  }

  switch (kind) {
    case 'clients': {
      const localRows = await databaseService.all(`
        SELECT id, external_id, first_name, last_name, company_name, type, email, phone,
               address, address_street, address_city, address_postal_code, address_country, is_active
          FROM clients
      `);
      const railwayRows = await railwayDb.all(`
        SELECT id, external_id, first_name, last_name, company_name, type, email, phone,
               address, address_street, address_city, address_postal_code, address_country, is_active
          FROM clients
      `);
      const fields = [
        'first_name', 'last_name', 'company_name', 'type',
        'email', 'phone', 'address', 'address_street',
        'address_city', 'address_postal_code', 'address_country', 'is_active'
      ];
      const describe = (row) => {
        if (!row) return 'brak danych';
        const parts = [];
        const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
        if (name) parts.push(name);
        if (row.company_name) parts.push(row.company_name);
        if (row.email) parts.push(row.email);
        const phone = sanitizePhone(row.phone);
        if (phone) parts.push(`tel:${phone}`);
        return parts.length ? parts.join(' | ') : `ID ${row.id}`;
      };
      const pick = createPickFunction(['first_name', 'last_name', 'company_name', 'email', 'phone', 'address_street', 'address_city', 'address_postal_code', 'address_country']);
      const getKey = (row) => {
        if (!row) return null;
        if (row.external_id) return `ext:${row.external_id}`;
        const phone = sanitizePhone(row.phone);
        if (phone) return `phone:${phone}`;
        if (row.email) return `email:${String(row.email).trim().toLowerCase()}`;
        return row.id ? `id:${row.id}` : null;
      };
      return buildDiagnosticsReport('clients', localRows, railwayRows, { getKey, fields, describe, pick });
    }
    case 'devices': {
      const localRows = await databaseService.all(`
        SELECT d.id, d.external_id, d.client_id, d.name, d.manufacturer, d.model, d.serial_number,
               d.category_id, d.is_active, c.external_id AS client_external_id
          FROM devices d
          LEFT JOIN clients c ON c.id = d.client_id
      `);
      const railwayRows = await railwayDb.all(`
        SELECT d.id, d.external_id, d.client_id, d.name, d.manufacturer, d.model, d.serial_number,
               d.category_id, d.is_active, c.external_id AS client_external_id
          FROM devices d
          LEFT JOIN clients c ON c.id = d.client_id
      `);
      const fields = ['name', 'manufacturer', 'model', 'serial_number', 'client_external_id', 'category_id', 'is_active'];
      const describe = (row) => {
        if (!row) return 'brak danych';
        const parts = [row.name || row.model || 'Urządzenie'];
        if (row.serial_number) parts.push(`#${row.serial_number}`);
        if (row.client_external_id) parts.push(`client:${row.client_external_id}`);
        return parts.join(' | ');
      };
      const pick = createPickFunction(['name', 'manufacturer', 'model', 'serial_number', 'client_external_id', 'category_id', 'is_active']);
      const getKey = (row) => {
        if (!row) return null;
        if (row.external_id) return `ext:${row.external_id}`;
        const serial = row.serial_number ? String(row.serial_number).trim().toLowerCase() : '';
        if (serial) return `serial:${serial}`;
        return row.id ? `id:${row.id}` : null;
      };
      return buildDiagnosticsReport('devices', localRows, railwayRows, { getKey, fields, describe, pick });
    }
    case 'orders': {
      const localRows = await databaseService.all(`
        SELECT o.id, o.order_number, o.client_id, o.device_id, o.assigned_user_id,
               o.status, o.priority,
               c.external_id AS client_external_id,
               d.external_id AS device_external_id
          FROM service_orders o
          LEFT JOIN clients c ON c.id = o.client_id
          LEFT JOIN devices d ON d.id = o.device_id
      `);
      const railwayRows = await railwayDb.all(`
        SELECT o.id, o.order_number, o.client_id, o.device_id, o.assigned_user_id,
               o.status, o.priority,
               c.external_id AS client_external_id,
               d.external_id AS device_external_id
          FROM service_orders o
          LEFT JOIN clients c ON c.id = o.client_id
          LEFT JOIN devices d ON d.id = o.device_id
      `);
      const fields = ['status', 'priority', 'client_external_id', 'device_external_id', 'assigned_user_id'];
      const describe = (row) => {
        if (!row) return 'brak danych';
        const parts = [`${row.order_number || 'brak numeru'}`];
        if (row.status) parts.push(`status:${row.status}`);
        if (row.client_external_id) parts.push(`client:${row.client_external_id}`);
        if (row.device_external_id) parts.push(`device:${row.device_external_id}`);
        return parts.join(' | ');
      };
      const pick = createPickFunction(['status', 'priority', 'client_external_id', 'device_external_id', 'assigned_user_id']);
      const getKey = (row) => {
        if (!row) return null;
        const num = row.order_number ? String(row.order_number).trim() : '';
        if (num) return `order:${num}`;
        return row.id ? `id:${row.id}` : null;
      };
      return buildDiagnosticsReport('orders', localRows, railwayRows, { getKey, fields, describe, pick });
    }
    default:
      throw new Error(`Unsupported diagnostics kind: ${kind}`);
  }
};

ipcMain.handle('diagnostics-railway', async (_event, kind) => {
  try {
    const report = await collectRailwayDiagnostics(kind);
    return { success: true, data: report };
  } catch (error) {
    console.error('Railway diagnostics error:', error);
    return { success: false, error: error?.message || 'Diagnostics failed' };
  }
});

ipcMain.handle('to-railway', async (_event, payload = {}) => {
  try {
    const base = (process.env.RAILWAY_API_BASE || 'https://web-production-fc58d.up.railway.app/api').replace(/\/$/, '');
    const path = String(payload.path || '/');
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const method = String(payload.method || 'GET').toUpperCase();
    const options = { method, headers: {} };
    if (payload.body != null) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload.body);
    }
    const fetchImpl = await ensureFetch();
    const response = await fetchImpl(url, options);
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!response.ok) {
      return { success: false, status: response.status, error: data?.error || response.statusText || 'Request failed' };
    }
    return { success: true, data };
  } catch (error) {
    console.error('to-railway error:', error);
    return { success: false, error: error?.message || 'Request failed' };
  }
});

// Funkcja pomocnicza do formatowania rozmiaru pliku
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Funkcja automatycznego tworzenia kopii zapasowych
const scheduleAutoBackup = () => {
  const createAutoBackup = async () => {
    try {
      console.log('📅 Tworzenie automatycznej kopii zapasowej...');
      
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'serwis.db');
      const backupDir = path.join(userDataPath, 'backups', 'auto');
      
      // Utwórz katalog auto-backup jeśli nie istnieje
      await ensureDirectoryExists(backupDir);
      
      // Nazwa pliku z prefiksem auto
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
      const dateStr = timestamp[0];
      const timeStr = timestamp[1].split('.')[0];
      const backupFileName = `auto-backup_${dateStr}_${timeStr}.db`;
      const backupPath = path.join(backupDir, backupFileName);
      
      // Skopiuj bazę danych
      await fs.copyFile(dbPath, backupPath);
      
      console.log(`✅ Automatyczna kopia zapasowa utworzona: ${backupFileName}`);
      
      // Usuń stare automatyczne kopie (zachowaj tylko 7 ostatnich)
      await cleanupOldAutoBackups(backupDir);
      
    } catch (error) {
      console.error('❌ Błąd podczas tworzenia automatycznej kopii zapasowej:', error);
    }
  };
  
  // Utwórz pierwszą kopię po 5 minutach od uruchomienia
  setTimeout(createAutoBackup, 5 * 60 * 1000);
  
  // Następnie co 24 godziny
  setInterval(createAutoBackup, 24 * 60 * 60 * 1000);
};

// Funkcja czyszczenia starych automatycznych kopii
const cleanupOldAutoBackups = async (backupDir) => {
  try {
    const files = await fs.readdir(backupDir);
    const autoBackups = [];
    
    // Użyj async fs.stat zamiast synchronicznego fs.statSync
    for (const file of files) {
      if (file.startsWith('auto-backup_') && file.endsWith('.db')) {
        const filePath = path.join(backupDir, file);
        const stat = await fs.stat(filePath);
        autoBackups.push({
          name: file,
          path: filePath,
          stat: stat
        });
      }
    }
    
    // Sortuj od najnowszych
    autoBackups.sort((a, b) => b.stat.mtime - a.stat.mtime);
    
    // Usuń kopie starsze niż 7 najnowszych
    if (autoBackups.length > 7) {
      for (let i = 7; i < autoBackups.length; i++) {
        await fs.unlink(autoBackups[i].path);
        console.log(`🗑️ Usunięto starą automatyczną kopię: ${autoBackups[i].name}`);
      }
    }
  } catch (error) {
    console.error('Błąd podczas czyszczenia starych kopii:', error);
  }
}; 