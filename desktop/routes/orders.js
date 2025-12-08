const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/desktop/orders/:technicianId - Pobierz zlecenia dla technika
router.get('/:technicianId', async (req, res) => {
  try {
    const { technicianId } = req.params;
    
    console.log(`📱 Pobieranie zleceń dla technika ${technicianId}`);
    
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
    
    const query = `
      SELECT 
        o.id,
        o.service_number,
        o.title,
        o.description,
        o.status,
        o.priority,
        o.estimated_hours,
        o.actual_hours,
        o.scheduled_date,
        o.actual_start_date,
        o.actual_end_date,
        o.completion_notes,
        o.work_photos,
        o.service_categories,
        o.completed_categories,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        c.address_street,
        c.address_city,
        c.address_postal_code,
        d.brand as device_brand,
        d.model as device_model,
        d.serial_number as device_serial,
        d.warranty_status
      FROM orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN devices d ON o.device_id = d.id
      WHERE o.assigned_to = $1
      AND o.status IN ('pending', 'in_progress', 'scheduled')
      ORDER BY 
        CASE o.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        o.scheduled_date ASC
    `;
    
    const result = await db.query(query, [technicianId]);
    
    // Parsuj JSON fields
    const orders = result.rows.map(order => ({
      ...order,
      service_categories: order.service_categories ? JSON.parse(order.service_categories) : [],
      completed_categories: order.completed_categories ? JSON.parse(order.completed_categories) : [],
      work_photos: order.work_photos ? JSON.parse(order.work_photos) : []
    }));
    
    console.log(`📱 Pobrano ${orders.length} zleceń dla technika ${technicianId}`);
    
    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
    
  } catch (error) {
    console.error('❌ Błąd pobierania zleceń:', error);
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas pobierania zleceń',
      details: error.message
    });
  }
});

// PUT /api/desktop/orders/:orderId/start - Rozpocznij zlecenie
router.put('/:orderId/start', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const query = `
      UPDATE orders 
      SET 
        status = 'in_progress',
        actual_start_date = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [orderId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Zlecenie nie zostało znalezione'
      });
    }
    
    console.log(`📱 Rozpoczęto zlecenie ${orderId}`);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Błąd rozpoczynania zlecenia:', error);
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas rozpoczynania zlecenia'
    });
  }
});

// PUT /api/desktop/orders/:orderId/complete - Zakończ zlecenie
router.put('/:orderId/complete', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      completion_notes, 
      work_photos, 
      completed_categories,
      actual_hours 
    } = req.body;
    
    const query = `
      UPDATE orders 
      SET 
        status = 'completed',
        actual_end_date = NOW(),
        completion_notes = $2,
        work_photos = $3,
        completed_categories = $4,
        actual_hours = $5
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [
      orderId,
      completion_notes,
      JSON.stringify(work_photos || []),
      JSON.stringify(completed_categories || []),
      actual_hours
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Zlecenie nie zostało znalezione'
      });
    }
    
    console.log(`📱 Zakończono zlecenie ${orderId}`);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Błąd kończenia zlecenia:', error);
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas kończenia zlecenia'
    });
  }
});

// PUT /api/desktop/orders/:orderId/update - Aktualizuj zlecenie
router.put('/:orderId/update', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      status,
      completion_notes, 
      work_photos, 
      completed_categories,
      actual_hours 
    } = req.body;
    
    const updates = [];
    const values = [orderId];
    let paramCount = 1;
    
    if (status) {
      updates.push(`status = $${++paramCount}`);
      values.push(status);
    }
    
    if (completion_notes !== undefined) {
      updates.push(`completion_notes = $${++paramCount}`);
      values.push(completion_notes);
    }
    
    if (work_photos !== undefined) {
      updates.push(`work_photos = $${++paramCount}`);
      values.push(JSON.stringify(work_photos));
    }
    
    if (completed_categories !== undefined) {
      updates.push(`completed_categories = $${++paramCount}`);
      values.push(JSON.stringify(completed_categories));
    }
    
    if (actual_hours !== undefined) {
      updates.push(`actual_hours = $${++paramCount}`);
      values.push(actual_hours);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Brak danych do aktualizacji'
      });
    }
    
    const query = `
      UPDATE orders 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Zlecenie nie zostało znalezione'
      });
    }
    
    console.log(`📱 Zaktualizowano zlecenie ${orderId}`);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Błąd aktualizacji zlecenia:', error);
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas aktualizacji zlecenia'
    });
  }
});

module.exports = router; 