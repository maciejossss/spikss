/*
  Safe schema fix for Railway: ensure device_files has column upload_date.
  - Idempotent: checks information_schema before ALTER
  - Uses DATABASE_URL env if provided; otherwise falls back to known Railway URL
*/
const { Client } = require('pg');

async function run() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:RejcVvKxoptptXgEpWDDwuKBDwgokfwb@shuttle.proxy.rlwy.net:15442/railway';
  const ssl = { rejectUnauthorized: false };
  const client = new Client({ connectionString, ssl });
  try {
    await client.connect();
    // Check table exists
    const tblRes = await client.query("SELECT to_regclass('public.device_files') as t");
    if (!tblRes.rows[0] || !tblRes.rows[0].t) {
      console.log('device_files table does not exist on Railway. Aborting without changes.');
      return;
    }
    // Check column
    const colRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='device_files' AND column_name='upload_date'`
    );
    if (colRes.rows.length === 0) {
      console.log('Adding upload_date column to device_files...');
      await client.query('ALTER TABLE device_files ADD COLUMN upload_date TIMESTAMP NULL');
      console.log('Added upload_date column.');
    } else {
      console.log('upload_date column already exists. No action.');
    }
  } catch (e) {
    console.error('Schema fix failed:', e.message);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

run();


