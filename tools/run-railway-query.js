const railwayDb = require('../desktop/railway-backend/database/connection');

const query = process.argv[2];

if (!query) {
  console.error('Użycie: node tools/run-railway-query.js "TWÓJ_SQL"');
  process.exit(1);
}

(async () => {
  try {
    const result = await railwayDb.query(query);
    if (Array.isArray(result.rows) && result.rows.length > 0) {
      console.table(result.rows);
    } else {
      console.log(`✅ Wykonano. Liczba wierszy: ${result.rowCount ?? 0}`);
    }
  } catch (error) {
    console.error('❌ Błąd:', error?.message || error);
  } finally {
    await railwayDb.closeConnection?.();
  }
})();

