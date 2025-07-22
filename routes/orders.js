const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/desktop/orders/:technicianId - Pobierz zlecenia dla technika (match local API)
router.get('/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    console.log(`📱 Pobieranie zleceń dla technika ${userId}`);
    
    // Query exactly matching local SQLite API
    const query = `
      SELECT 
        o.*,
        CASE 
          WHEN c.company_name IS NOT NULL AND c.company_name != '' 
          THEN c.company_name 
          ELSE COALESCE(c.first_name || ' ' || c.last_name, 'Klient bez nazwy')
        END as client_name,
        c.phone as client_phone,
        COALESCE(c.address_street || ', ' || c.address_city, c.address) as address,
        d.name || ' ' || d.model as device_name,
        u.full_name as technician_name
      FROM service_orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN devices d ON o.device_id = d.id
      LEFT JOIN users u ON o.assigned_user_id = u.id
      WHERE o.assigned_user_id = $1 
        AND o.status IN ('new', 'in_progress')
      ORDER BY o.priority DESC, o.scheduled_date ASC
    `;
    
    const result = await db.query(query, [userId]);
    
    console.log(`📱 Pobrano ${result.rows.length} zleceń dla technika ${userId}`);
    
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

    if (!['new', 'in_progress', 'completed'].includes(status)) {
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

    // Walidacja
    if (!orderId || !technicianId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const now = new Date().toISOString();
    
    await db.query(`
      UPDATE service_orders 
      SET assigned_user_id = $1, priority = $2, status = 'new', updated_at = $3
      WHERE id = $4
    `, [technicianId, priority || 'medium', now, orderId]);

    console.log(`📤 Wysłano zlecenie ${orderId} do technika ${technicianId}`);
    res.json({ success: true, orderId, technicianId });
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