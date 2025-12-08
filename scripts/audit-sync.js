#!/usr/bin/env node
/**
 * Read-only audit: compare Railway vs Desktop (SQLite) without modifying data.
 * Outputs JSON reports into ./audit/
 */
const fs = require('fs');
const path = require('path');
const ARGS = process.argv.slice(2);
const SKIP_SQLITE = (
  String(process.env.SKIP_SQLITE || '').toLowerCase() === '1' ||
  String(process.env.SKIP_SQLITE || '').toLowerCase() === 'true' ||
  ARGS.includes('--skip-sqlite')
);
const DESKTOP_BASE = (process.env.DESKTOP_BASE || 'http://localhost:5174/api/desktop').replace(/\/$/, '');
let sqlite3;
let SQLITE_AVAILABLE = false;
if (!SKIP_SQLITE) {
  try {
    sqlite3 = require('sqlite3');
    SQLITE_AVAILABLE = true;
  } catch (e) {
    console.warn('⚠️ sqlite3 module not available. Falling back to desktop HTTP API if possible.');
  }
}

const RAILWAY_BASE = process.env.RAILWAY_BASE || 'https://web-production-fc58d.up.railway.app/api';

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return await res.json();
}

function getLocalDbPath() {
  // Windows: %APPDATA%/serwis-desktop/serwis.db
  const appData = process.env.APPDATA || path.join(process.env.HOME || process.env.USERPROFILE || '.', 'AppData', 'Roaming');
  return path.join(appData, 'serwis-desktop', 'serwis.db');
}

async function readSqlite(dbPath, sql, params = []) {
  if (SKIP_SQLITE || !SQLITE_AVAILABLE) return [];
  const db = new sqlite3.Database(dbPath);
  const rows = await new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
  db.close();
  return rows;
}

async function fetchLocalJson(pathname) {
  const url = `${DESKTOP_BASE}${pathname}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return await res.json();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function indexPartsByKey(arr) {
  const map = new Map();
  for (const it of arr || []) {
    const pn = (it.part_number || it.partNumber || '').trim().toLowerCase();
    const key = pn ? `pn:${pn}` : `nm:${(it.name||'').trim().toLowerCase()}|mf:${(it.manufacturer||'').trim().toLowerCase()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  }
  return map;
}

function diffParts(remote, local) {
  const rMap = indexPartsByKey(remote);
  const lMap = indexPartsByKey(local);
  const onlyRemote = [];
  const onlyLocal = [];
  const conflicts = [];

  const allKeys = new Set([...rMap.keys(), ...lMap.keys()]);
  for (const k of allKeys) {
    const r = rMap.get(k) || [];
    const l = lMap.get(k) || [];
    if (r.length && !l.length) {
      onlyRemote.push(...r);
    } else if (!r.length && l.length) {
      onlyLocal.push(...l);
    } else if (r.length && l.length) {
      // compare selected fields for drift
      const r0 = r[0];
      const l0 = l[0];
      const drift = {};
      if ((r0.name||'') !== (l0.name||'')) drift.name = { remote: r0.name, local: l0.name };
      if ((r0.manufacturer||'') !== (l0.manufacturer||'')) drift.manufacturer = { remote: r0.manufacturer, local: l0.manufacturer };
      if ((r0.category||'') !== (l0.category||'')) drift.category = { remote: r0.category, local: l0.category };
      if (Object.keys(drift).length) conflicts.push({ key: k, remote: r0, local: l0, drift });
    }
  }
  return { onlyRemote, onlyLocal, conflicts };
}

(async () => {
  try {
    console.log('🔎 Starting read-only sync audit...');
    const outDir = path.resolve('audit');
    ensureDir(outDir);

    // 1) Railway snapshots
    console.log('🌐 Fetching Railway data...');
    const [remoteCats, remoteParts, remoteOrders] = await Promise.all([
      fetchJson(`${RAILWAY_BASE}/part-categories`).catch(()=>({ data: [] })),
      fetchJson(`${RAILWAY_BASE}/parts`).catch(()=>({ success:true, items: [] })),
      fetchJson(`${RAILWAY_BASE}/desktop/orders`).catch(()=>[])
    ]);
    const cats = Array.isArray(remoteCats.data) ? remoteCats.data : [];
    const parts = Array.isArray(remoteParts.items) ? remoteParts.items : (Array.isArray(remoteParts) ? remoteParts : []);
    const orders = Array.isArray(remoteOrders) ? remoteOrders : [];
    writeJson(path.join(outDir, 'railway_part_categories.json'), cats);
    writeJson(path.join(outDir, 'railway_parts.json'), parts);
    writeJson(path.join(outDir, 'railway_orders.json'), orders);

    // 2) Desktop snapshots
    const dbPath = getLocalDbPath();
    console.log('💾 Reading local SQLite:', dbPath, SKIP_SQLITE ? '(SKIPPED)' : '');
    let localParts = await readSqlite(dbPath, `SELECT id, name, manufacturer, category, part_number, device_id, updated_at FROM spare_parts`).catch(()=>[]);
    let localOrders = await readSqlite(dbPath, `SELECT id, device_id, status, updated_at FROM service_orders`).catch(()=>[]);
    // HTTP fallback via desktop API if sqlite unavailable/empty
    if (!localParts.length) {
      localParts = await fetchLocalJson('/spare-parts').catch(()=>[]);
    }
    if (!localOrders.length) {
      const all = await fetchLocalJson('/orders').catch(()=>[]);
      localOrders = Array.isArray(all) ? all.map(o => ({ id: o.id, device_id: o.device_id, status: o.status, updated_at: o.updated_at })) : [];
    }
    writeJson(path.join(outDir, 'desktop_spare_parts.json'), localParts);
    writeJson(path.join(outDir, 'desktop_service_orders.json'), localOrders);

    // 3) Diffs
    console.log('📊 Computing deltas...');
    const partsDelta = diffParts(parts, localParts);
    writeJson(path.join(outDir, 'delta_parts.json'), partsDelta);

    // Orders – tylko porównanie liczebności i id-set (bez drążenia order_parts w tej wersji)
    const rIds = new Set(orders.map(o => Number(o.id))); 
    const lIds = new Set(localOrders.map(o => Number(o.id)));
    const onlyRemoteOrders = [...rIds].filter(id => !lIds.has(id));
    const onlyLocalOrders = [...lIds].filter(id => !rIds.has(id));
    writeJson(path.join(outDir, 'delta_orders.json'), { onlyRemoteOrders, onlyLocalOrders, remoteCount: orders.length, localCount: localOrders.length });

    console.log('✅ Audit completed. See ./audit/ directory for JSON reports.');
  } catch (e) {
    console.error('❌ Audit failed:', e.message);
    process.exit(1);
  }
})();


