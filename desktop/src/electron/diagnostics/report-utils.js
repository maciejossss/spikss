const sanitizePhone = (value) => {
  if (!value) return '';
  return String(value).replace(/\D+/g, '');
};

const normalizeDiagnosticValue = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? Number(value) : null;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const createPickFunction = (fields) => (row) => {
  if (!row) return null;
  const picked = {};
  for (const field of fields) {
    picked[field] = row[field] ?? null;
  }
  return picked;
};

const buildDiagnosticsReport = (kind, localRows, railwayRows, options) => {
  const { getKey, fields, describe, pick } = options;
  const localMap = new Map();
  const railwayMap = new Map();

  for (const row of localRows) {
    const key = getKey(row);
    if (!key) continue;
    if (!localMap.has(key)) {
      localMap.set(key, row);
    }
  }

  for (const row of railwayRows) {
    const key = getKey(row);
    if (!key) continue;
    const arr = railwayMap.get(key) || [];
    arr.push(row);
    railwayMap.set(key, arr);
  }

  const duplicates = [];
  const mismatches = [];
  const onlyDesktop = [];
  const onlyRailway = [];

  const allKeys = new Set([...localMap.keys(), ...railwayMap.keys()]);
  for (const key of allKeys) {
    const localRow = localMap.get(key) || null;
    const remoteList = railwayMap.get(key) || [];

    if (!localRow && remoteList.length > 0) {
      if (remoteList.length > 1) {
        duplicates.push({
          key,
          items: remoteList.map((r) => ({ id: r.id, summary: describe(r) }))
        });
      }
      remoteList.forEach((r) => {
        onlyRailway.push({
          key,
          id: r.id,
          summary: describe(r)
        });
      });
      continue;
    }

    if (localRow && remoteList.length === 0) {
      onlyDesktop.push({
        key,
        id: localRow.id,
        summary: describe(localRow)
      });
      continue;
    }

    if (remoteList.length > 1) {
      duplicates.push({
        key,
        items: remoteList.map((r) => ({ id: r.id, summary: describe(r) }))
      });
    }

    const remoteRow = remoteList[0];
    const differences = [];
    for (const field of fields) {
      const localVal = normalizeDiagnosticValue(localRow[field]);
      const remoteVal = normalizeDiagnosticValue(remoteRow[field]);
      if (localVal !== remoteVal) {
        differences.push({
          field,
          desktop: localVal,
          railway: remoteVal
        });
      }
    }
    if (differences.length > 0) {
      mismatches.push({
        key,
        local: pick(localRow),
        railway: pick(remoteRow),
        differences
      });
    }
  }

  return {
    kind,
    timestamp: new Date().toISOString(),
    totals: {
      desktop: localRows.length,
      railway: railwayRows.length
    },
    duplicates,
    mismatches,
    onlyDesktop,
    onlyRailway
  };
};

const buildClientsReport = (localRows, railwayRows) => {
  const fields = [
    'first_name', 'last_name', 'company_name', 'type',
    'email', 'phone', 'address', 'address_street',
    'address_city', 'address_postal_code', 'address_country', 'is_active'
  ];
  const describe = (row) => {
    if (!row) return 'brak danych';
    const parts = [];
    const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
    if (name) parts.push(name);
    if (row.company_name) parts.push(row.company_name);
    if (row.email) parts.push(row.email);
    const phone = sanitizePhone(row.phone);
    if (phone) parts.push(`tel:${phone}`);
    return parts.length ? parts.join(' | ') : `ID ${row.id}`;
  };
  const pick = createPickFunction(['first_name', 'last_name', 'company_name', 'email', 'phone', 'address_street', 'address_city', 'address_postal_code', 'address_country']);
  const getKey = (row) => {
    if (!row) return null;
    if (row.external_id) return `ext:${row.external_id}`;
    const phone = sanitizePhone(row.phone);
    if (phone) return `phone:${phone}`;
    if (row.email) return `email:${String(row.email).trim().toLowerCase()}`;
    return row.id ? `id:${row.id}` : null;
  };
  return buildDiagnosticsReport('clients', localRows, railwayRows, { getKey, fields, describe, pick });
};

const buildDevicesReport = (localRows, railwayRows) => {
  const fields = ['name', 'manufacturer', 'model', 'serial_number', 'client_external_id', 'category_id', 'is_active'];
  const describe = (row) => {
    if (!row) return 'brak danych';
    const parts = [row.name || row.model || 'Urządzenie'];
    if (row.serial_number) parts.push(`#${row.serial_number}`);
    if (row.client_external_id) parts.push(`client:${row.client_external_id}`);
    return parts.join(' | ');
  };
  const pick = createPickFunction(['name', 'manufacturer', 'model', 'serial_number', 'client_external_id', 'category_id', 'is_active']);
  const getKey = (row) => {
    if (!row) return null;
    if (row.external_id) return `ext:${row.external_id}`;
    const serial = row.serial_number ? String(row.serial_number).trim().toLowerCase() : '';
    if (serial) return `serial:${serial}`;
    return row.id ? `id:${row.id}` : null;
  };
  return buildDiagnosticsReport('devices', localRows, railwayRows, { getKey, fields, describe, pick });
};

const buildOrdersReport = (localRows, railwayRows) => {
  const fields = ['status', 'priority', 'client_external_id', 'device_external_id', 'assigned_user_id'];
  const describe = (row) => {
    if (!row) return 'brak danych';
    const parts = [`${row.order_number || 'brak numeru'}`];
    if (row.status) parts.push(`status:${row.status}`);
    if (row.client_external_id) parts.push(`client:${row.client_external_id}`);
    if (row.device_external_id) parts.push(`device:${row.device_external_id}`);
    return parts.join(' | ');
  };
  const pick = createPickFunction(['status', 'priority', 'client_external_id', 'device_external_id', 'assigned_user_id']);
  const getKey = (row) => {
    if (!row) return null;
    const num = row.order_number ? String(row.order_number).trim() : '';
    if (num) return `order:${num}`;
    return row.id ? `id:${row.id}` : null;
  };
  return buildDiagnosticsReport('orders', localRows, railwayRows, { getKey, fields, describe, pick });
};

module.exports = {
  sanitizePhone,
  normalizeDiagnosticValue,
  createPickFunction,
  buildDiagnosticsReport,
  buildClientsReport,
  buildDevicesReport,
  buildOrdersReport
};

