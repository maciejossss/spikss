const express = require('express')
const router = express.Router()
const db = require('../database/connection')
const fs = require('fs')
const path = require('path')
const multer = require('multer')

// Multer in-memory for uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 10 } })

// DELETE /api/device-files/:id — usuń wpis i plik z dysku (jeśli w /uploads)
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.status(400).json({ success: false, error: 'Invalid id' })

    // Pobierz rekord, aby znać ścieżkę
    const r = await db.query('SELECT id, file_path FROM device_files WHERE id = $1 LIMIT 1', [id])
    if (!r.rows || r.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Not found' })
    }
    const filePath = String(r.rows[0].file_path || '')

    // Usuń wiersz z bazy najpierw (aby nie blokować przez błędy FS)
    await db.query('DELETE FROM device_files WHERE id = $1', [id])

    // Spróbuj usunąć plik, jeśli wskazuje na nasz katalog uploads
    try {
      if (filePath && (filePath.startsWith('/uploads/') || filePath.startsWith('uploads/'))) {
        const uploadsDir = path.join(__dirname, '..', 'uploads')
        const rel = filePath.replace(/^\/+uploads\/+/, '')
        const abs = path.join(uploadsDir, rel)
        const resolved = path.resolve(abs)
        const safeRoot = path.resolve(uploadsDir)
        if (resolved.startsWith(safeRoot) && fs.existsSync(resolved)) {
          fs.unlinkSync(resolved)
        }
      }
    } catch (_) { /* ignore fs errors */ }

    return res.json({ success: true })
  } catch (e) {
    console.error('device-files delete error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

module.exports = router

// POST /api/railway/device-files/upload — upload file and register for a device
// FormData: device_id, file (single or files[] multiple)
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    const deviceId = Number(req.body?.device_id)
    if (!Number.isFinite(deviceId) || deviceId <= 0) {
      return res.status(400).json({ success: false, error: 'device_id required' })
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads')
    try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }) } catch(_) {}

    const files = Array.isArray(req.files) ? req.files : []
    const saved = []
    for (const f of files) {
      try {
        const orig = String(f.originalname || 'file.bin')
        const base = orig.replace(/[^A-Za-z0-9_.-]+/g, '_') || 'file.bin'
        const ext = base.includes('.') ? base.split('.').pop() : (f.mimetype && f.mimetype.split('/')[1]) || 'bin'
        const unique = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`
        const full = path.join(uploadsDir, unique)
        fs.writeFileSync(full, f.buffer)
        const publicUrl = `/uploads/${unique}`

        const ins = await db.query(
          `INSERT INTO device_files (device_id, file_name, file_path, file_type, file_size, upload_date)
           VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id`,
          [deviceId, base, publicUrl, f.mimetype || null, f.size || (f.buffer ? f.buffer.length : null)]
        )
        const fileId = (ins.rows && ins.rows[0]) ? ins.rows[0].id : null
        saved.push({ id: fileId, file_name: base, url: publicUrl, mime_type: f.mimetype || null })
      } catch (e) {
        console.error('device file upload save error', e)
      }
    }

    return res.json({ success: true, items: saved })
  } catch (e) {
    console.error('device file upload error', e)
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})


