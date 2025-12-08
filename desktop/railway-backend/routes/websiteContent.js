const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../database/connection');

const DEFAULT_CONTENT_PATH = path.resolve(__dirname, '../../website/content/landing-default.json');

const readDefaultContent = () => {
  try {
    const raw = fs.readFileSync(DEFAULT_CONTENT_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[website-content] Unable to read default landing content:', error.message);
    return {
      hero: {},
      highlights: [],
      services: [],
      form: {}
    };
  }
};

const DEFAULT_CONTENT = readDefaultContent();

const ensureTable = (async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS website_content_blocks (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(100) UNIQUE NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('❌ website_content_blocks ensure table error:', error.message);
  }
})();

const sanitizeSlug = (value) => {
  const slug = String(value || '').trim().toLowerCase();
  return slug.replace(/[^a-z0-9-_]/g, '').slice(0, 60) || 'landing';
};

const mapRow = (row) => {
  if (!row) return null;
  return {
    slug: row.slug,
    content: row.payload || DEFAULT_CONTENT,
    updatedAt: row.updated_at || new Date().toISOString()
  };
};

router.get('/', async (_req, res) => {
  await ensureTable;
  try {
    const result = await db.query('SELECT slug, payload, updated_at FROM website_content_blocks WHERE slug = $1 LIMIT 1', ['landing']);
    const row = result.rows && result.rows.length ? mapRow(result.rows[0]) : { slug: 'landing', content: DEFAULT_CONTENT, updatedAt: null };
    return res.json({ success: true, data: row });
  } catch (error) {
    console.error('❌ website-content GET failed:', error);
    return res.status(500).json({ success: false, error: 'database-error' });
  }
});

router.get('/:slug', async (req, res) => {
  await ensureTable;
  const slug = sanitizeSlug(req.params.slug);
  try {
    const result = await db.query('SELECT slug, payload, updated_at FROM website_content_blocks WHERE slug = $1 LIMIT 1', [slug]);
    if (!result.rows || !result.rows.length) {
      return res.json({ success: true, data: { slug, content: DEFAULT_CONTENT, updatedAt: null } });
    }
    return res.json({ success: true, data: mapRow(result.rows[0]) });
  } catch (error) {
    console.error('❌ website-content GET slug failed:', error);
    return res.status(500).json({ success: false, error: 'database-error' });
  }
});

router.put('/:slug', async (req, res) => {
  await ensureTable;
  const slug = sanitizeSlug(req.params.slug);
  const payload = req.body?.content || req.body?.payload;

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ success: false, error: 'invalid-payload' });
  }

  try {
    await db.query(
      `INSERT INTO website_content_blocks (slug, payload, updated_at)
       VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (slug) DO UPDATE SET
         payload = EXCLUDED.payload,
         updated_at = EXCLUDED.updated_at`,
      [slug, JSON.stringify(payload)]
    );
    return res.json({ success: true, data: { slug, content: payload, updatedAt: new Date().toISOString() } });
  } catch (error) {
    console.error('❌ website-content PUT failed:', error);
    return res.status(500).json({ success: false, error: 'database-error' });
  }
});

module.exports = router;

