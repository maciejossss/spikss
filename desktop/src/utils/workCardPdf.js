const escapeHtml = (value) => {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const formatDate = (value) => {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('pl-PL')
  } catch (_) {
    return String(value)
  }
}

const formatTimeRange = (start, end) => {
  const fmt = (val) => {
    if (!val) return ''
    try {
      return new Date(val).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    } catch (_) {
      return ''
    }
  }
  const s = fmt(start)
  const e = fmt(end)
  if (s && e) return `${s} – ${e}`
  if (s) return `Start: ${s}`
  if (e) return `Koniec: ${e}`
  return ''
}

const formatHours = (hours) => {
  const num = typeof hours === 'number' ? hours : Number(hours)
  if (!num || Number.isNaN(num)) return ''
  return `${(Math.round(num * 10) / 10).toFixed(1)} h`
}

const formatDuration = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return ''
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export const renderWorkCardHtml = ({ company = null, technicianName = '', fromDate = '', toDate = '', entries = [] } = {}) => {
  const companyLines = []
  if (company?.name) companyLines.push(escapeHtml(company.name))
  if (company?.address) companyLines.push(escapeHtml(company.address))
  if (company?.nip) companyLines.push(`NIP: ${escapeHtml(company.nip)}`)
  if (company?.phone) companyLines.push(`Tel: ${escapeHtml(company.phone)}`)
  if (company?.email) companyLines.push(`Email: ${escapeHtml(company.email)}`)

  const logoSrc = company?.logo_base64
    ? `data:${company.logo_mime || 'image/png'};base64,${company.logo_base64}`
    : null

  const tableRows = entries.map((entry) => {
    const partsList = entry.parts && entry.parts.length
      ? entry.parts.map(part => {
          const qty = part.quantity ? ` ×${part.quantity}` : ''
          const pn = part.part_number ? ` (${escapeHtml(part.part_number)})` : ''
          return `${escapeHtml(part.name)}${pn}${qty}`
        }).join('<br>')
      : '<span class="muted">Brak części</span>'

    const categories = entry.categoryLabels && entry.categoryLabels.length
      ? entry.categoryLabels.map(label => `<span class="tag">${escapeHtml(label)}</span>`).join('')
      : '<span class="muted">Brak kategorii</span>'

    return `
      <tr>
        <td>
          <div class="strong">${escapeHtml(entry.order_number || ('#' + entry.id))}</div>
          <div>${formatDate(entry.actual_end_date)}</div>
          <div class="time-range">${escapeHtml(formatTimeRange(entry.actual_start_date, entry.actual_end_date))}</div>
        </td>
        <td>
          <div class="strong">${escapeHtml(entry.client_display_name || 'Klient nieznany')}</div>
          ${entry.client_address ? `<div>${escapeHtml(entry.client_address)}</div>` : ''}
          ${entry.device_name ? `<div>${escapeHtml([entry.device_name, entry.device_model, entry.device_serial].filter(Boolean).join(', '))}</div>` : ''}
        </td>
        <td>${entry.completion_notes ? escapeHtml(entry.completion_notes).replace(/\n/g, '<br>') : '<span class="muted">Brak danych</span>'}</td>
        <td>${entry.technician_notes ? escapeHtml(entry.technician_notes).replace(/\n/g, '<br>') : '<span class="muted">—</span>'}</td>
        <td>${partsList}</td>
        <td>${categories}</td>
        <td class="centered">${entry.has_protocol ? 'tak' : 'nie'}</td>
        <td class="centered">${entry.has_invoice ? 'tak' : 'nie'}</td>
        <td class="hours">
          ${entry.reported_hours != null ? `<div>Zgłoszone: ${escapeHtml(formatHours(entry.reported_hours))}</div>` : ''}
          ${entry.calculated_seconds != null ? `<div class="muted">Policzone: ${escapeHtml(formatDuration(entry.calculated_seconds))}</div>` : ''}
          ${entry.reported_hours == null && entry.calculated_seconds == null ? '<div>0 h</div>' : ''}
        </td>
      </tr>
    `
  }).join('')

  const totalHours = entries.reduce((sum, entry) => {
    if (entry.reported_hours != null) return sum + entry.reported_hours
    if (entry.calculated_hours != null) return sum + entry.calculated_hours
    return sum
  }, 0)

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4; margin: 12mm 14mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1f2937; margin: 0; }
          header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 12px; }
          .company { font-size: 9.5pt; line-height: 1.4; }
          .logo { max-height: 60px; max-width: 140px; object-fit: contain; }
          .title { font-size: 13pt; font-weight: 600; text-transform: uppercase; }
          .meta { font-size: 9pt; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 9pt; }
          th, td { border: 1px solid #1f2937; padding: 6px; vertical-align: top; }
          th { background: #f8fafc; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.5px; }
          .muted { color: #9ca3af; font-style: italic; }
          .tag { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; margin: 0 4px 4px 0; font-size: 8pt; }
          .summary { margin-top: 12px; font-size: 9.5pt; }
          .strong { font-weight: 600; }
          .time-range { color: #6b7280; font-size: 8pt; margin-top: 2px; }
          .centered { text-align: center; white-space: nowrap; }
          .hours { text-align: right; white-space: nowrap; }
          .footer { margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .signature { width: 260px; text-align: center; }
          .signature .line { border-top: 1px solid #111; margin-bottom: 4px; height: 28px; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <div class="title">Karta pracy</div>
            <div class="meta">Technik: ${escapeHtml(technicianName || '—')}</div>
            <div class="meta">Zakres: ${formatDate(fromDate)} – ${formatDate(toDate)}</div>
          </div>
          <div class="company">
            ${companyLines.map(line => `<div>${line}</div>`).join('')}
          </div>
          ${logoSrc ? `<img src="${logoSrc}" class="logo" alt="Logo">` : ''}
        </header>

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Klient / Lokalizacja</th>
              <th>Opis prac (A)</th>
              <th>Uwagi (B)</th>
              <th>Użyte materiały</th>
              <th>Kategorie</th>
              <th>Protokół</th>
              <th>Faktura</th>
              <th>Godziny</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="9" class="muted" style="text-align:center;">Brak wpisów</td></tr>'}
          </tbody>
        </table>

        <div class="summary">
          Łączny czas pracy: <strong>${formatHours(totalHours)}</strong> &nbsp;•&nbsp; Liczba wpisów: <strong>${entries.length}</strong>
        </div>

        <div class="footer">
          <div></div>
          <div class="signature">
            <div class="line"></div>
            <div>Podpis serwisanta</div>
          </div>
        </div>
      </body>
    </html>
  `
}

