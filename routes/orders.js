const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/desktop/orders/:technicianId - Pobierz zlecenia dla technika (match local API)
router.get('/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    console.log(`📱 Pobieranie zleceń dla technika ${userId}`);
    
    // Sprawdź i dodaj kolumnę brand jeśli nie istnieje
    try {
      const checkResult = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'brand'
      `);
      
      if (checkResult.rows.length === 0) {
        console.log('🔧 Dodaję kolumnę brand do tabeli devices...');
        await db.query('ALTER TABLE devices ADD COLUMN brand VARCHAR(255)');
        console.log('✅ Kolumna brand została dodana');
      } else {
        console.log('ℹ️ Kolumna brand już istnieje');
      }
    } catch (error) {
      console.error('❌ Błąd sprawdzania/dodawania kolumny brand:', error.message);
      // Kontynuuj bez kolumny brand
    }
    
    // Sprawdź i dodaj kolumnę full_name jeśli nie istnieje
    try {
      const checkFullNameResult = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'full_name'
      `);
      
      if (checkFullNameResult.rows.length === 0) {
        console.log('🔧 Dodaję kolumnę full_name do tabeli devices...');
        await db.query('ALTER TABLE devices ADD COLUMN full_name VARCHAR(255)');
        console.log('✅ Kolumna full_name została dodana');
      } else {
        console.log('ℹ️ Kolumna full_name już istnieje');
      }
    } catch (error) {
      console.error('❌ Błąd sprawdzania/dodawania kolumny full_name:', error.message);
      // Kontynuuj bez kolumny full_name
    }
    
    // Sprawdź i dodaj kolumnę warranty_status jeśli nie istnieje
    try {
      const checkWarrantyResult = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'devices' AND column_name = 'warranty_status'
      `);
      
      if (checkWarrantyResult.rows.length === 0) {
        console.log('🔧 Dodaję kolumnę warranty_status do tabeli devices...');
        await db.query('ALTER TABLE devices ADD COLUMN warranty_status VARCHAR(50)');
        console.log('✅ Kolumna warranty_status została dodana');
      } else {
        console.log('ℹ️ Kolumna warranty_status już istnieje');
      }
    } catch (error) {
      console.error('❌ Błąd sprawdzania/dodawania kolumny warranty_status:', error.message);
      // Kontynuuj bez kolumny warranty_status
    }
    
    // Query bez kolumny full_name - używamy tylko name
    const query = `
      SELECT 
        o.*,
        -- Klient: preferuj company_name, w przeciwnym razie użyj emaila lub 'Klient #id'
        COALESCE(
          NULLIF(c.company_name, ''),
          NULLIF(TRIM(
            COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')
          ), ''),
          NULLIF(c.email, ''),
          'Klient #' || COALESCE(c.id::text, 'brak')
        ) AS client_name,
        c.phone AS client_phone,
        c.email AS client_email,
        c.address_street,
        c.address_city,
        c.address_postal_code,
        c.address_country,
        COALESCE(
          NULLIF(c.address_street, '') || ', ' || NULLIF(c.address_postal_code, '') || ' ' || NULLIF(c.address_city, ''),
          c.address,
          'Brak adresu'
        ) AS address,
        -- Urządzenie
        d.name AS device_name,
        d.model AS device_model,
        d.brand AS device_brand,
        d.serial_number AS device_serial,
        d.warranty_status AS device_warranty,
        -- Technik
        u.full_name AS technician_name
      FROM service_orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN devices d ON o.device_id = d.id
      LEFT JOIN users u ON o.assigned_user_id = u.id
      WHERE o.assigned_user_id = $1
    `;
    
    const result = await db.query(query, [userId]);
    
    console.log(`📱 Pobrano ${result.rows.length} zleceń dla technika ${userId}`);
    console.log('🔍 DEBUG - Przykładowe zlecenie:', result.rows.length > 0 ? JSON.stringify(result.rows[0], null, 2) : 'Brak zleceń');
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Błąd pobierania zleceń:', error);
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas pobierania zleceń',
      details: error.message
    });
  }
});

// PUT /api/desktop/orders/:orderId/status - Aktualizuj status zlecenia (match local API)
router.put('/:orderId/status', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { status, completedCategories, photos, notes } = req.body;

    // Walidacja
    if (!orderId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['new', 'in_progress', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const now = new Date().toISOString();

    // Pobierz aktualne zlecenie
    const currentOrder = await db.query('SELECT * FROM service_orders WHERE id = $1', [orderId]);
    if (currentOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const current = currentOrder.rows[0];
    let updateData = { status, updated_at: now };

    // === ROZPOCZĘCIE PRACY ===
    if (status === 'in_progress' && current.status === 'new') {
      updateData.started_at = now;
      console.log(`🚀 Rozpoczęto pracę nad zleceniem ${orderId}`);
    }

    // === UKOŃCZENIE PRACY ===
    if (status === 'completed') {
      updateData.completed_at = now;
      updateData.completed_categories = JSON.stringify(completedCategories || []);
      updateData.work_photos = JSON.stringify(photos || []);
      updateData.completion_notes = notes || '';

      // Oblicz rzeczywiste godziny pracy
      const startDate = new Date(current.started_at || now);
      const endDate = new Date(now);
      const actualHours = Math.round((endDate - startDate) / (1000 * 60 * 60) * 10) / 10;
      updateData.actual_hours = actualHours;

      console.log(`✅ Ukończono zlecenie ${orderId}, czas pracy: ${actualHours}h`);
    }

    // === ZLECENIE NIE ZREALIZOWANE ===
    if (status === 'rejected') {
      updateData.completed_at = now;
      updateData.completion_notes = notes || '';

      console.log(`❌ Zlecenie ${orderId} oznaczone jako nie zrealizowane`);
    }

    // Aktualizuj w bazie danych
    const updateFields = Object.keys(updateData).map((field, index) => `${field} = $${index + 2}`).join(', ');
    const updateValues = Object.values(updateData);
    
    await db.query(
      `UPDATE service_orders SET ${updateFields} WHERE id = $1`,
      [orderId, ...updateValues]
    );

    res.json({ success: true, orderId, status, timestamp: now });
  } catch (error) {
    console.error('❌ Błąd aktualizacji zlecenia:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/desktop/orders/:orderId/assign - Wyślij zlecenie do technika
router.post('/:orderId/assign', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { technicianId, priority } = req.body;

    // Walidacja - orderId jest wymagane, technicianId może być null (odznaczenie)
    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    const now = new Date().toISOString();
    
    // Jeśli technicianId jest null/undefined, odznacz technika
    if (!technicianId) {
      await db.query(`
        UPDATE service_orders 
        SET assigned_user_id = NULL, updated_at = $1
        WHERE id = $2
      `, [now, orderId]);
      
      console.log(`📤 Odznaczono technika ze zlecenia ${orderId}`);
      res.json({ success: true, orderId, technicianId: null });
    } else {
      // Przypisz technika
      await db.query(`
        UPDATE service_orders 
        SET assigned_user_id = $1, priority = $2, status = 'assigned', updated_at = $3
        WHERE id = $4
      `, [technicianId, priority || 'medium', now, orderId]);

      console.log(`📤 Wysłano zlecenie ${orderId} do technika ${technicianId}`);
      res.json({ success: true, orderId, technicianId });
    }
  } catch (error) {
    console.error('❌ Błąd wysyłania zlecenia:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/desktop/orders/active-timers - Pobierz aktywne zlecenia z timerami
router.get('/active-timers', async (req, res) => {
  try {
    // Pobierz wszystkie zlecenia w trakcie realizacji
    const query = `
      SELECT o.*, 
             CASE 
               WHEN c.company_name IS NOT NULL AND c.company_name != '' 
               THEN c.company_name 
               ELSE COALESCE(c.first_name || ' ' || c.last_name, 'Klient bez nazwy')
             END as client_name,
             u.full_name as technician_name
      FROM service_orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN users u ON o.assigned_user_id = u.id
      WHERE o.status = 'in_progress'
        AND o.started_at IS NOT NULL
      ORDER BY o.started_at DESC
    `;
    
    const result = await db.query(query);
    
    // Oblicz elapsed time dla każdego zlecenia
    const activeTimers = result.rows.map(order => {
      const startTime = new Date(order.started_at);
      const now = new Date();
      const elapsedMs = now - startTime;
      const elapsedHours = Math.round(elapsedMs / (1000 * 60 * 60) * 10) / 10;
      
      return {
        ...order,
        elapsed_time: elapsedHours,
        timer_started: order.started_at
      };
    });

    res.json(activeTimers);
  } catch (error) {
    console.error('❌ Błąd pobierania timerów:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router; 