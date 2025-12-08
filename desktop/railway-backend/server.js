require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const db = require('./database/connection');

// Import routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const devicesRoutes = require('./routes/devices');
const clientsRoutes = require('./routes/clients');
const techniciansRoutes = require('./routes/technicians');
const ordersRoutes = require('./routes/orders');
const ordersCompatRoutes = require('./routes/orders-compat');
const deleteRoutes = require('./routes/delete');
const syncRoutes = require('./routes/sync');
const partsRoutes = require('./routes/parts');
const serviceRequestsRoutes = require('./routes/service-requests');
const eventsRoutes = require('./routes/events');
const deviceFilesRoutes = require('./routes/device-files');
const timeRoutes = require('./routes/time');
const companyRoutes = require('./routes/company');
const protocolsRoutes = require('./routes/protocols');
const websiteContentRoutes = require('./routes/websiteContent');

// Import migration
const migrate = require('./database/migrate');

const app = express();
const PORT = process.env.PORT || 3000;
const PENDING_MAX_AGE_DAYS = Math.max(parseInt(process.env.PENDING_MAX_AGE_DAYS || '30', 10), 1);
const PENDING_CLEAN_INTERVAL_MS = Math.max(parseInt(process.env.PENDING_CLEAN_INTERVAL_MS || String(6 * 60 * 60 * 1000), 10), 60 * 60 * 1000);

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// ===== MIDDLEWARE =====

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS configuration for global access (apply BEFORE rate limiter)
const corsOptions = {
  origin: '*',
  credentials: false,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // Future-proof allowed headers (non-breaking widening)
  allowedHeaders: [
    'Content-Type', 'Authorization', 'User-Agent', 'Origin', 'Accept',
    'Referer', 'Cache-Control', 'Access-Control-Request-Private-Network'
  ]
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// Rate limiting (skip preflight OPTIONS; higher ceiling to avoid false 429 during bursts)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Too many requests, please try again later' }
})
app.use('/api/', limiter);

// Body parsing
// Zwiększony limit ze względu na przesył zdjęć (base64) z aplikacji mobilnej
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging for mobile debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.get('User-Agent') || 'Unknown';
  const origin = req.get('Origin') || 'Direct';
  
  console.log(`📱 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`   └─ IP: ${req.ip || req.connection.remoteAddress}`);
  console.log(`   └─ User-Agent: ${userAgent.substring(0, 50)}${userAgent.length > 50 ? '...' : ''}`);
  console.log(`   └─ Origin: ${origin}`);
  
  next();
});

// ===== BACKGROUND TASKS =====
async function autoRejectStalePendingChanges() {
  try {
    const result = await db.query(
      `UPDATE pending_changes
          SET status = 'rejected',
              decided_at = CURRENT_TIMESTAMP
        WHERE status = 'pending'
          AND created_at < NOW() - ($1 * INTERVAL '1 day')`,
      [PENDING_MAX_AGE_DAYS]
    );
    if (result.rowCount > 0) {
      console.log(`🧹 [pending-cleanup] Auto-rejected ${result.rowCount} stale pending changes (> ${PENDING_MAX_AGE_DAYS} days)`);
    }
  } catch (error) {
    console.error('⚠️ [pending-cleanup] Failed to auto-reject stale pending changes:', error.message);
  }
}

function schedulePendingCleanup() {
  // Uruchom natychmiast po starcie, a następnie cyklicznie
  autoRejectStalePendingChanges();
  const handle = setInterval(() => {
    autoRejectStalePendingChanges();
  }, PENDING_CLEAN_INTERVAL_MS);
  if (typeof handle.unref === 'function') {
    handle.unref();
  }
}

// ===== ROUTES - Register specific routes BEFORE generic ones =====
// IMPORTANT: Specific routes like /pending-import must be registered BEFORE /:id route
app.use('/api/orders', ordersCompatRoutes);

// ===== Read-only compatibility fix for mobile: normalize /api/orders/:id to latest by order_number =====
// This route is registered AFTER specific routes to ensure they take precedence.
app.get('/api/orders/:id', async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid order id' });
    }
    const preferLatest = String(req.query.preferLatest || '').toLowerCase() === 'true';
    // If not preferring latest, respond with exact by id (backward compatible)
    if (!preferLatest) {
      const exact = await db.query(`
        SELECT o.*,
          CASE WHEN c.company_name IS NOT NULL AND c.company_name <> '' THEN c.company_name
               ELSE COALESCE(c.first_name || ' ' || c.last_name, 'Klient bez nazwy') END AS client_name,
          c.phone AS client_phone, c.email AS client_email,
          COALESCE(c.address_street || ', ' || c.address_postal_code || ' ' || c.address_city || ', ' || c.address_country, c.address, 'Brak adresu') AS address,
          d.name AS device_name, d.model AS device_model, d.brand AS device_brand, d.serial_number AS device_serial,
          /* Złożona data+czas dla UI mobilnego */
          COALESCE(
            CASE WHEN o.scheduled_time IS NOT NULL AND o.scheduled_date IS NOT NULL
                 THEN to_char(o.scheduled_date, 'YYYY-MM-DD') || 'T' || o.scheduled_time
                 ELSE NULL END,
            to_char(o.scheduled_date, 'YYYY-MM-DD')
          ) AS scheduled_datetime
        FROM service_orders o
        LEFT JOIN clients c ON o.client_id = c.id
        LEFT JOIN devices d ON o.device_id = d.id
        WHERE o.id = $1
        LIMIT 1
      `, [orderId]);
      if (!exact.rows || exact.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      return res.json({ success: true, order: exact.rows[0] });
    }
    // Fetch the referenced record to learn its order_number
    const base = await db.query('SELECT order_number FROM service_orders WHERE id = $1 LIMIT 1', [orderId]);
    if (!base.rows || base.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const num = base.rows[0].order_number;
    // Pick the newest row for this order_number and join client/device info
    const include = String(req.query.include||'').toLowerCase();
    const q = `
      WITH ranked AS (
        SELECT o.*, ROW_NUMBER() OVER (
          PARTITION BY o.order_number
          ORDER BY o.updated_at DESC NULLS LAST, o.id DESC
        ) AS rn
        FROM service_orders o
        WHERE o.order_number = $1
      )
      SELECT 
        r.*,
        /* Złożona data+czas dla UI mobilnego */
        COALESCE(
          CASE WHEN r.scheduled_time IS NOT NULL AND r.scheduled_date IS NOT NULL
               THEN to_char(r.scheduled_date, 'YYYY-MM-DD') || 'T' || r.scheduled_time
               ELSE NULL END,
          to_char(r.scheduled_date, 'YYYY-MM-DD')
        ) AS scheduled_datetime,
        CASE WHEN c.company_name IS NOT NULL AND c.company_name <> ''
             THEN c.company_name
             ELSE COALESCE(c.first_name || ' ' || c.last_name, 'Klient bez nazwy')
        END AS client_name,
        c.phone AS client_phone,
        c.email AS client_email,
        c.address_street,
        c.address_city,
        c.address_postal_code,
        c.address_country,
        COALESCE(
          c.address_street || ', ' || c.address_postal_code || ' ' || c.address_city || ', ' || c.address_country,
          c.address,
          'Brak adresu'
        ) AS address,
        d.name AS device_name,
        d.model AS device_model,
        d.brand AS device_brand,
        d.serial_number AS device_serial
      FROM ranked r
      LEFT JOIN clients c ON r.client_id = c.id
      LEFT JOIN devices d ON r.device_id = d.id
      WHERE r.rn = 1
      LIMIT 1`;
    const latest = await db.query(q, [num]);
    if (!latest.rows || latest.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    // include=client,device compatibility (already joined; keep structure flat for backward compatibility)
    return res.json({ success: true, order: latest.rows[0] });
  } catch (e) {
    // fall through to legacy compat if something goes wrong
    return next();
  }
});

// ===== STATIC FILES =====

const CUSTOM_DOMAIN_REGEX = /instalacjeserwis\.pl$/i;
const serveWebsiteStatic = express.static('website', {
  maxAge: '1d',
  etag: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
});

app.use((req, res, next) => {
  try {
    if (!CUSTOM_DOMAIN_REGEX.test(String(req.hostname || ''))) return next();
    if (req.path.startsWith('/api/')) return next();
    serveWebsiteStatic(req, res, (err) => {
      if (err) return next(err);
      if (res.headersSent) return;
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(path.resolve('website', 'index.html'));
    });
  } catch (_) {
    return next();
  }
});

// Serve mobile app static files ONLY at root. For HTML disable cache.
// Używamy globalnego katalogu public w katalogu roboczym projektu (stary widok)
app.use(express.static('public', {
  maxAge: '1d',
  etag: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Serve device uploads from persistent folder (if present)
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '365d', etag: false }));
  // Fallback: jeśli express.static nie znalazł pliku, NIE podawaj SPA – zwróć 404
  app.get('/uploads/*', (req, res) => {
    const rel = String(req.path || '').replace(/^\/+uploads\/+/, '');
    const abs = path.join(UPLOADS_DIR, rel);
    if (fs.existsSync(abs)) return res.sendFile(abs);
    return res.status(404).send('Not found');
  });
  console.log('🖼️ Static uploads mounted at /uploads');
} catch (e) {
  console.warn('⚠️ Unable to mount /uploads static dir:', e.message);
}

// ===== ROUTES =====
// Note: /api/orders routes are registered earlier (before /:id handler) to ensure specific routes take precedence
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/technicians', techniciansRoutes);
app.use('/api/desktop/orders', ordersRoutes);
// app.use('/api/orders', ordersCompatRoutes); // MOVED ABOVE - registered before /:id route
app.use('/api/delete', deleteRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api', eventsRoutes);
app.use('/api/time', timeRoutes);
// Proste endpointy dla list kategorii/części, aby nie było 404
app.use('/api', partsRoutes);
// Mobile service requests (PWA)
app.use('/api/service-requests', serviceRequestsRoutes);
// Device files management (delete)
app.use('/api/device-files', deviceFilesRoutes);
// Alias for desktop sync flow
app.use('/api/railway/device-files', deviceFilesRoutes);
app.use('/api/website/content', websiteContentRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/protocols', protocolsRoutes);

// Optional: keep legacy /app path but redirect to root
app.get(['/app', '/app/*'], (req, res) => {
  res.redirect(302, '/');
});

// Mobile App SPA under root
app.get(['/', '/*'], (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found', path: req.path });
  }
  // Nie obsługuj ścieżki /uploads przez SPA
  if (req.path.startsWith('/uploads/')) {
    return res.status(404).send('Not found');
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  // Stary widok: index.html z globalnego katalogu public (root projektu)
  res.sendFile(path.resolve('public', 'index.html'));
});

// Keep health JSON under /api/health only; root already redirects

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// ===== SERVER STARTUP =====

async function startServer() {
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    await db.testConnection();
    console.log('✅ Database connected successfully');
    
    // Run database migration
    console.log('🔄 Running database migration...');
    await migrate();
    console.log('✅ Database migration completed');

    // Uruchom cykliczne sprzątanie pendingów
    schedulePendingCleanup();
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 ========================================');
      console.log(`🌍 Serwis API running on port ${PORT}`);
      console.log(`📱 Global access: https://your-app.railway.app`);
      console.log(`🏥 Health check: https://your-app.railway.app/api/health`);
      console.log(`👨‍🔧 Technicians: https://your-app.railway.app/api/technicians`);
      console.log('🚀 ========================================');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await db.closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await db.closeConnection();
  process.exit(0);
});

// Start the server
startServer(); 