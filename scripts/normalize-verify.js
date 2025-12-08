const p=require('path'),sqlite3=require('sqlite3').verbose();
const dbPath=p.join(process.env.APPDATA||process.env.HOME,'serwis-desktop','serwis.db');
const db=new sqlite3.Database(dbPath,sqlite3.OPEN_READONLY);
db.all("SELECT LOWER(status) status, COUNT(*) cnt FROM service_orders GROUP BY LOWER(status) ORDER BY cnt DESC",[],(e,rows)=>{console.log(rows); db.close();});
