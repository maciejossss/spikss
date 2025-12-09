#!/usr/bin/env node

/**
 * Export Railway diagnostics as CSV/JSON files.
 *
 * This script recreates the logic used by the desktop diagnostics UI and stores
 * structured reports under reports/railway-diagnostics/<timestamp>.
 *
 * Usage:
 *   node tools/export-railway-diagnostics.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const resolveSqlite3 = () => {
  const candidates = [
    'sqlite3',
    path.resolve(__dirname, '../desktop/node_modules/sqlite3'),
    path.resolve(__dirname, '../node_modules/sqlite3')
  ];
  const errors = [];
  for (const candidate of candidates) {
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      return require(candidate);
    } catch (error) {
      errors.push(error?.message || String(error));
    }
  }
  throw new Error(`Nie można załadować modułu sqlite3. Próbowano:\n${candidates.join('\n')}.\nOstatnie błędy:\n${errors.join('\n')}`);
};

const sqlite3 = resolveSqlite3();
console.log('ℹ️ Using sqlite3');
const railwayDb = require('../desktop/railway-backend/database/connection');
const {
  buildClientsReport,
  buildDevicesReport,
  buildOrdersReport
} = require('../desktop/src/electron/diagnostics/report-utils');

const OUTPUT_ROOT = path.resolve(__dirname, '../reports/railway-diagnostics');

const ensureDirectory = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const detectSqlitePath = () => {
  const baseDir = process.env.APPDATA || process.env.HOME || path.join(os.homedir(), 'AppData', 'Roaming');
  const candidateDir = path.join(baseDir, 'serwis-desktop');
  const candidates = ['serwis.db', 'serwis.sqlite'].map((name) => path.join(candidateDir, name));
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Nie znaleziono lokalnej bazy SQLite w ${candidateDir}`);
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const writeCsv = (filePath, headers, rows) => {
  const lines = [];
  lines.push(headers.map(csvEscape).join(','));
  for (const row of rows) {
    const values = headers.map((header) => csvEscape(row[header]));
    lines.push(values.join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
};

const flattenDuplicates = (entries) => {
  const rows = [];
  for (const entry of entries) {
    for (const item of entry.items || []) {
      rows.push({
        key: entry.key,
        id: item.id,
        summary: item.summary
      });
    }
  }
  return rows;
};

const flattenMismatches = (entries) => {
  const rows = [];
  for (const entry of entries) {
    for (const diff of entry.differences || []) {
      rows.push({
        key: entry.key,
        field: diff.field,
        desktop: diff.desktop,
        railway: diff.railway
      });
    }
  }
  return rows;
};

const flattenSingles = (entries) => {
  return entries.map((entry) => ({
    key: entry.key,
    id: entry.id,
    summary: entry.summary
  }));
};

const exportReportFiles = (report, outDir) => {
  const prefix = report.kind;
  writeJson(path.join(outDir, `${prefix}-report.json`), report);

  if (Array.isArray(report.duplicates) && report.duplicates.length > 0) {
    writeCsv(
      path.join(outDir, `${prefix}-duplicates.csv`),
      ['key', 'id', 'summary'],
      flattenDuplicates(report.duplicates)
    );
  }

  if (Array.isArray(report.mismatches) && report.mismatches.length > 0) {
    writeCsv(
      path.join(outDir, `${prefix}-mismatches.csv`),
      ['key', 'field', 'desktop', 'railway'],
      flattenMismatches(report.mismatches)
    );
  }

  if (Array.isArray(report.onlyDesktop) && report.onlyDesktop.length > 0) {
    writeCsv(
      path.join(outDir, `${prefix}-only-desktop.csv`),
      ['key', 'id', 'summary'],
      flattenSingles(report.onlyDesktop)
    );
  }

  if (Array.isArray(report.onlyRailway) && report.onlyRailway.length > 0) {
    writeCsv(
      path.join(outDir, `${prefix}-only-railway.csv`),
      ['key', 'id', 'summary'],
      flattenSingles(report.onlyRailway)
    );
  }
};

const queryAll = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const openLocalDatabase = (dbPath) => new Promise((resolve, reject) => {
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) reject(err);
    else resolve(db);
  });
});

const closeLocalDatabase = (db) => new Promise((resolve) => {
  db.close(() => resolve());
});

const fetchLocalData = async (sqliteDb) => {
  const clients = await queryAll(sqliteDb, `
    SELECT id, external_id, first_name, last_name, company_name, type, email, phone,
           address, address_street, address_city, address_postal_code, address_country, is_active
      FROM clients
  `);

  const devices = await queryAll(sqliteDb, `
    SELECT d.id, d.external_id, d.client_id, d.name, d.manufacturer, d.model, d.serial_number,
           d.category_id, d.is_active, c.external_id AS client_external_id
      FROM devices d
      LEFT JOIN clients c ON c.id = d.client_id
  `);

  const orders = await queryAll(sqliteDb, `
    SELECT o.id, o.order_number, o.client_id, o.device_id, o.assigned_user_id,
           o.status, o.priority,
           c.external_id AS client_external_id,
           d.external_id AS device_external_id
      FROM service_orders o
      LEFT JOIN clients c ON c.id = o.client_id
      LEFT JOIN devices d ON d.id = o.device_id
  `);

  return { clients, devices, orders };
};

const fetchRailwayData = async () => {
  const clients = await railwayDb.all(`
    SELECT id, external_id, first_name, last_name, company_name, type, email, phone,
           address, address_street, address_city, address_postal_code, address_country, is_active
      FROM clients
  `);

  const devices = await railwayDb.all(`
    SELECT d.id, d.external_id, d.client_id, d.name, d.manufacturer, d.model, d.serial_number,
           d.category_id, d.is_active, c.external_id AS client_external_id
      FROM devices d
      LEFT JOIN clients c ON c.id = d.client_id
  `);

  const orders = await railwayDb.all(`
    SELECT o.id, o.order_number, o.client_id, o.device_id, o.assigned_user_id,
           o.status, o.priority,
           c.external_id AS client_external_id,
           d.external_id AS device_external_id
      FROM service_orders o
      LEFT JOIN clients c ON c.id = o.client_id
      LEFT JOIN devices d ON d.id = o.device_id
  `);

  return { clients, devices, orders };
};

const main = async () => {
  const sqlitePath = detectSqlitePath();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(OUTPUT_ROOT, timestamp);
  ensureDirectory(outputDir);

  console.log(`📁 Eksport diagnostyki Railway do ${outputDir}`);
  console.log(`📄 Lokalna baza: ${sqlitePath}`);

  const sqliteDb = await openLocalDatabase(sqlitePath);
  try {
    const local = await fetchLocalData(sqliteDb);
    const remote = await fetchRailwayData();

    const clientsReport = buildClientsReport(local.clients, remote.clients);
    const devicesReport = buildDevicesReport(local.devices, remote.devices);
    const ordersReport = buildOrdersReport(local.orders, remote.orders);

    exportReportFiles(clientsReport, outputDir);
    exportReportFiles(devicesReport, outputDir);
    exportReportFiles(ordersReport, outputDir);

    console.log('✅ Zakończono eksport. Sprawdź pliki JSON/CSV w katalogu wynikowym.');
  } finally {
    await closeLocalDatabase(sqliteDb);
    await railwayDb.closeConnection?.();
  }
};

main().catch((error) => {
  console.error('❌ Błąd eksportu diagnostyki:', error?.message || error);
  process.exitCode = 1;
});

