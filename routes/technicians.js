const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// GET /api/technicians - Pobierz listę techników (match local API)
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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

module.exports = router;
