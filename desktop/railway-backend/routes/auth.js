const express = require('express')
const router = express.Router()

// Prosty, pamięciowy magazyn sesji (restart procesu czyści sesje)
const sessions = new Map()

function parseCookies(req) {
  const header = req.headers.cookie || ''
  return Object.fromEntries(
    header.split(';').map(v => v.trim()).filter(Boolean).map(v => {
      const idx = v.indexOf('=')
      if (idx === -1) return [v, '']
      return [decodeURIComponent(v.slice(0, idx)), decodeURIComponent(v.slice(idx + 1))]
    })
  )
}

function setSessionCookie(res, sid) {
  const attrs = [
    `sid=${encodeURIComponent(sid)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=None',
    'Secure',
    'Max-Age=1209600' // 14 dni
  ]
  res.setHeader('Set-Cookie', attrs.join('; '))
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'sid=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0')
}

// GET /api/auth/me — stan sesji
router.get('/me', (req, res) => {
  try {
    const cookies = parseCookies(req)
    const sid = cookies.sid || null
    const user = sid ? sessions.get(sid) : null
    if (!sid || !user) {
      return res.json({ authenticated: false })
    }
    return res.json({ authenticated: true, user })
  } catch (e) {
    return res.json({ authenticated: false })
  }
})

// POST /api/auth/login — login po nazwie użytkownika z tabeli users (bez sprawdzania hasła)
// Wyłączone w produkcji (używamy tylko PIN-login). Można włączyć przez env ALLOW_PASSWORD_LOGIN=true
router.post('/login', express.json(), async (req, res) => {
  try {
    if (process.env.ALLOW_PASSWORD_LOGIN !== 'true') {
      return res.status(410).json({ success: false, error: 'Password login disabled' })
    }
    const { username = '', password = '' } = (req.body || {})
    const uname = String(username || '').trim()
    if (!uname || !password) return res.status(400).json({ success: false, error: 'Username and password required' })
    const db = require('../database/connection')
    const r = await db.query(
      `SELECT id, username, full_name, role, COALESCE(is_active,true) as is_active, password_hash
         FROM users WHERE LOWER(username)=LOWER($1) LIMIT 1`, [uname]
    )
    if (!r.rows || !r.rows[0] || !r.rows[0].is_active) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }
    const bcrypt = require('bcryptjs')
    const ok = await bcrypt.compare(String(password), r.rows[0].password_hash || '')
    if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' })
    const found = { id: r.rows[0].id, username: r.rows[0].username, full_name: r.rows[0].full_name || r.rows[0].username, role: r.rows[0].role || 'technician' }
    const sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessions.set(sid, found)
    setSessionCookie(res, sid)
    return res.json({ success: true, user: found })
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/auth/pin-login — logowanie PIN-em (4-8 cyfr), bcrypt porównanie
router.post('/pin-login', express.json(), async (req, res) => {
  try {
    const { userId, pin } = req.body || {}
    const uid = userId != null ? Number(userId) : null
    const pinStr = String(pin || '').trim()
    if (!/^[0-9]{4,8}$/.test(pinStr)) {
      return res.status(400).json({ success: false, error: 'Invalid input' })
    }
    const db = require('../database/connection')
    const bcrypt = require('bcryptjs')
    let row = null

    if (uid) {
      const r = await db.query(
        `SELECT id, username, full_name, role,
                COALESCE(is_active,true) as is_active,
                COALESCE(mobile_authorized,true) as mobile_authorized,
                mobile_pin_hash
           FROM users
          WHERE id = $1
          LIMIT 1`,
        [uid]
      )
      row = r.rows && r.rows[0] ? r.rows[0] : null
      if (!row || !row.is_active || !row.mobile_authorized) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' })
      }
      const ok = row.mobile_pin_hash ? await bcrypt.compare(pinStr, row.mobile_pin_hash) : false
      if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' })
    } else {
      // Brak userId – spróbuj dopasować po samym PIN (iteracyjne porównanie hashy)
      try {
        const q = await db.query(`
          SELECT id, username, full_name, role,
                 COALESCE(is_active,true) AS is_active,
                 COALESCE(mobile_authorized,true) AS mobile_authorized,
                 mobile_pin_hash
            FROM users
           WHERE COALESCE(is_active,true) = true AND mobile_pin_hash IS NOT NULL
        `)
        for (const u of q.rows || []) {
          try {
            if (u.mobile_pin_hash && await bcrypt.compare(pinStr, u.mobile_pin_hash)) {
              if (u.mobile_authorized) { row = u; break }
            }
          } catch (_) {}
        }
      } catch (_) {}
      if (!row) return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }

    const found = { id: row.id, username: row.username, full_name: row.full_name || row.username, role: row.role || 'technician' }
    const sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessions.set(sid, found)
    setSessionCookie(res, sid)
    return res.json({ success: true, user: found })
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Server error' })
  }
})

// POST /api/auth/logout — wyczyść sesję
router.post('/logout', (_req, res) => {
  try {
    // Usuń z mapy jeśli jest
    const cookies = parseCookies(_req)
    const sid = cookies.sid || null
    if (sid) sessions.delete(sid)
  } catch (_) {}
  clearSessionCookie(res)
  return res.json({ success: true })
})

module.exports = router


