const p = require('path');
const sqlite3 = (()=>{ try { return require('./desktop/node_modules/sqlite3').verbose() } catch(_) { return require('sqlite3').verbose() } })();
const dbPath = p.join(process.env.APPDATA || process.env.HOME, 'serwis-desktop', 'serwis.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (e)=>{ if(e) console.error('Open error:', e.message) });
const nums = ['SRV-2025-867556','SRV-2025-811955'];
const q = "SELECT id,order_number,status,assigned_user_id,created_at,updated_at,started_at,completed_at,actual_start_date,actual_end_date,desktop_sync_status,desktop_synced_at FROM service_orders WHERE order_number IN (?,?)";
db.all(q, nums, (e, rows) => {
  if (e) { console.error('Query error:', e.message) } else { console.log(JSON.stringify(rows, null, 2)) }
  db.close();
});
