const p=require('path');const sqlite3=require('sqlite3').verbose();
const dbPath=p.join(process.env.APPDATA||process.env.HOME,'serwis-desktop','serwis.db');
const db=new sqlite3.Database(dbPath,sqlite3.OPEN_READONLY);
const num='SRV-2025-867556';
db.all(\"SELECT id,order_number,status,created_at,updated_at,started_at,completed_at FROM service_orders WHERE order_number=? ORDER BY id\",[num],(e,rows)=>{ if(e)console.error(e.message); else console.log(JSON.stringify(rows,null,2)); db.close(); });
