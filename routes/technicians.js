const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/technicians - Pobierz listę techników (match local API)
router.get('/technicians', async (req, res) => {
  try {
    console.log('📱 Pobieranie listy techników...');
    
    // Query exactly matching local SQLite API
    const query = `
      SELECT id, username, full_name, email, role
      FROM users 
      WHERE role IN ('technician', 'installer') 
      AND is_active = true
      ORDER BY full_name ASC
    `;
    
    const result = await db.query(query);
    
    console.log(`📱 Pobrano ${result.rows.length} techników:`, 
                result.rows.map(t => ({id: t.id, name: t.full_name})));
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Błąd pobierania techników:', error);
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas pobierania techników',
      details: error.message
    });
  }
});

// GET /api/technicians/:id - Pobierz szczegóły technika
router.get('/technicians/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT id, username, full_name, email, role, is_active, created_at, updated_at
      FROM users 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Technik nie został znaleziony'
      });
    }
    
    console.log(`📱 Pobrano szczegóły technika ${id}`);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Błąd pobierania technika:', error);
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas pobierania technika'
    });
  }
});

// POST /api/technicians - Dodaj nowego technika
router.post('/technicians', async (req, res) => {
  try {
    const { username, full_name, email, role = 'technician', password_hash } = req.body;
    
    // Walidacja
    if (!username || !full_name || !password_hash) {
      return res.status(400).json({
        success: false,
        error: 'Brak wymaganych pól: username, full_name, password_hash'
      });
    }
    
    const query = `
      INSERT INTO users (username, password_hash, full_name, email, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, full_name, email, role, is_active, created_at
    `;
    
    const result = await db.query(query, [
      username, password_hash, full_name, email, role, true
    ]);
    
    console.log(`📱 Dodano nowego technika: ${full_name} (ID: ${result.rows[0].id})`);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Błąd dodawania technika:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        error: 'Użytkownik o tej nazwie już istnieje'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas dodawania technika'
    });
  }
});

// PUT /api/technicians/:id - Aktualizuj technika
router.put('/technicians/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, is_active } = req.body;
    
    // Sprawdź czy technik istnieje
    const existsQuery = 'SELECT id FROM users WHERE id = $1';
    const existsResult = await db.query(existsQuery, [id]);
    
    if (existsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Technik nie został znaleziony'
      });
    }
    
    // Dynamiczne budowanie query
    const updates = [];
    const values = [id];
    let paramCount = 1;
    
    if (full_name !== undefined) {
      updates.push(`full_name = $${++paramCount}`);
      values.push(full_name);
    }
    
    if (email !== undefined) {
      updates.push(`email = $${++paramCount}`);
      values.push(email);
    }
    
    if (role !== undefined) {
      updates.push(`role = $${++paramCount}`);
      values.push(role);
    }
    
    if (is_active !== undefined) {
      updates.push(`is_active = $${++paramCount}`);
      values.push(is_active);
    }
    
    updates.push(`updated_at = $${++paramCount}`);
    values.push(new Date().toISOString());
    
    if (updates.length === 1) { // tylko updated_at
      return res.status(400).json({
        success: false,
        error: 'Brak danych do aktualizacji'
      });
    }
    
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING id, username, full_name, email, role, is_active, updated_at
    `;
    
    const result = await db.query(query, values);
    
    console.log(`📱 Zaktualizowano technika ${id}`);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Błąd aktualizacji technika:', error);
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas aktualizacji technika'
    });
  }
});

// DELETE /api/technicians/:id - Usuń technika (soft delete)
router.delete('/technicians/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Sprawdź czy technik istnieje
    const existsQuery = 'SELECT id FROM users WHERE id = $1';
    const existsResult = await db.query(existsQuery, [id]);
    
    if (existsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Technik nie został znaleziony'
      });
    }
    
    // Soft delete - ustaw is_active na false
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = $2
      WHERE id = $1
      RETURNING id, username, full_name, is_active
    `;
    
    const result = await db.query(query, [id, new Date().toISOString()]);
    
    console.log(`📱 Dezaktywowano technika ${id}`);
    
    res.json({
      success: true,
      message: 'Technik został dezaktywowany',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Błąd usuwania technika:', error);
    res.status(500).json({
      success: false,
      error: 'Błąd serwera podczas usuwania technika'
    });
  }
});

module.exports = router; 