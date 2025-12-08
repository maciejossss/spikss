const p=require('path'),sqlite3=require('sqlite3').verbose();
const dbPath=p.join(process.env.APPDATA||process.env.HOME,'serwis-desktop','serwis.db');
const db=new sqlite3.Database(dbPath);
db.serialize(()=>{
  db.run('BEGIN');
  // a) statusy 'przed czasem' / 'przed_czasem' => 'new'
  db.run("UPDATE service_orders SET status='new', updated_at=CURRENT_TIMESTAMP WHERE LOWER(status) IN ('przed czasem','przed_czasem')");
  // b) completed_at bez started_at => cofnij do 'assigned' lub 'new'
  db.run("UPDATE service_orders SET status = CASE WHEN assigned_user_id IS NOT NULL THEN 'assigned' ELSE 'new' END, completed_at=NULL, updated_at=CURRENT_TIMESTAMP WHERE started_at IS NULL AND completed_at IS NOT NULL");
  db.run('COMMIT', (e)=>{ if(e){ console.error('Commit error',e.message); db.run('ROLLBACK'); } db.close(); });
});
