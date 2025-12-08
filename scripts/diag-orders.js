const p=require('path');const sqlite3=require('sqlite3').verbose();
const dbPath=p.join(process.env.APPDATA||process.env.HOME,'serwis-desktop','serwis.db');
const db=new sqlite3.Database(dbPath,sqlite3.OPEN_READONLY,(e)=>{ if(e) console.error('Open',e.message) });

function q(sql,params=[],label='') {
  return new Promise(r=>db.all(sql,params,(e,rows)=>{ if(e)console.error(label,e.message); else { console.log('\\n=== '+label+' ==='); console.log(JSON.stringify(rows,null,2)); } r(); }));
}

(async()=>{
  // 1) Rozkład statusów (czy mamy niekanoniczne wartości)
  await q("SELECT LOWER(status) status, COUNT(*) cnt FROM service_orders GROUP BY LOWER(status) ORDER BY cnt DESC", [], "STATUS_DISTRIBUTION");

  // 2) Nietypowe statusy (nie w: new/assigned/in_progress/completed/rejected)
  await q("SELECT id,order_number,status,created_at FROM service_orders WHERE LOWER(status) NOT IN ('new','assigned','in_progress','completed','rejected') ORDER BY created_at DESC LIMIT 50", [], "NONCANONICAL_STATUSES");

  // 3) Anomalie: completed_at != NULL bez started_at (ostatnie 50)
  await q("SELECT id,order_number,status,started_at,completed_at,created_at,updated_at FROM service_orders WHERE started_at IS NULL AND completed_at IS NOT NULL ORDER BY updated_at DESC LIMIT 50", [], "COMPLETED_WITHOUT_STARTED");

  // 4) Duplikaty numerów zleceń
  await q("SELECT order_number, COUNT(*) cnt FROM service_orders GROUP BY order_number HAVING COUNT(*)>1 ORDER BY cnt DESC", [], "DUPLICATE_ORDER_NUMBERS");

  // 5) Ostatnie zmiany (100): szybki podgląd trendu
  await q("SELECT id,order_number,status,assigned_user_id,started_at,completed_at,created_at,updated_at FROM service_orders ORDER BY updated_at DESC LIMIT 100", [], "LAST_100_UPDATED");

  db.close();
})();
