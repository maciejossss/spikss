let ensurePromise = null;

const STATEMENTS = [
  `ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS scheduled_time VARCHAR(8)`,
  `ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS completed_categories TEXT`,
  `ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS completion_notes TEXT`,
  `ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS parts_used TEXT`,
  `ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS work_photos TEXT`,
  `ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2)`,
  `ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS actual_start_date TIMESTAMP`,
  `ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS actual_end_date TIMESTAMP`,
  `ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS external_id INTEGER`,
  `CREATE INDEX IF NOT EXISTS idx_service_orders_external_id ON service_orders(external_id)`,
  `ALTER TABLE clients ADD COLUMN IF NOT EXISTS external_id VARCHAR(255)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_external_id ON clients(external_id)`,
  `ALTER TABLE devices ADD COLUMN IF NOT EXISTS external_id VARCHAR(255)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_external_id ON devices(external_id)`
];

module.exports = async function ensureOrderColumns(db) {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      for (const sql of STATEMENTS) {
        try {
          await db.query(sql);
        } catch (err) {
          console.warn('[ensureOrderColumns] statement failed:', sql, '-', err.message);
        }
      }
    })().catch(err => {
      ensurePromise = null;
      throw err;
    });
  }
  return ensurePromise;
};



