const express = require('express')
const router = express.Router()
const db = require('../database/connection')
const path = require('path')
const fsp = require('fs/promises')

const ensureDirectory = async (dirPath) => {
  try {
    await fsp.mkdir(dirPath, { recursive: true })
  } catch (_) {}
}

const sanitizeFileName = (name = '') => {
  return String(name)
    .trim()
    .replace(/[^a-zA-Z0-9.\-_]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    || `protocol_${Date.now()}.pdf`
}

router.post('/', async (req, res) => {
  try {
    const payload = req.body || {}
    const protocol = payload.protocol || {}
    const pdf = payload.pdf || null

    if (!protocol.order_id) {
      return res.status(400).json({ success: false, error: 'order_id_required' })
    }

    const toJson = (value) => (value == null || value === '') ? null : JSON.stringify(value)
    const issuedAt = protocol.issued_at ? new Date(protocol.issued_at).toISOString() : null
    const createdAt = protocol.created_at ? new Date(protocol.created_at).toISOString() : new Date().toISOString()
    const updatedAt = protocol.updated_at ? new Date(protocol.updated_at).toISOString() : createdAt

    const result = await db.query(`
      INSERT INTO service_protocols (
        external_id, order_id, technician_id, client_id, device_id,
        template_name, template_version, issued_at, created_at, updated_at,
        acceptance_clause, summary_text, notes,
        service_company_snapshot, client_snapshot, device_snapshot, technician_snapshot,
        checks_snapshot, steps_snapshot, parts_snapshot,
        sync_status
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20,
        'received'
      )
      ON CONFLICT (external_id) DO UPDATE SET
        order_id = EXCLUDED.order_id,
        technician_id = EXCLUDED.technician_id,
        client_id = EXCLUDED.client_id,
        device_id = EXCLUDED.device_id,
        template_name = EXCLUDED.template_name,
        template_version = EXCLUDED.template_version,
        issued_at = COALESCE(EXCLUDED.issued_at, service_protocols.issued_at),
        created_at = COALESCE(service_protocols.created_at, EXCLUDED.created_at),
        updated_at = EXCLUDED.updated_at,
        acceptance_clause = EXCLUDED.acceptance_clause,
        summary_text = EXCLUDED.summary_text,
        notes = EXCLUDED.notes,
        service_company_snapshot = EXCLUDED.service_company_snapshot,
        client_snapshot = EXCLUDED.client_snapshot,
        device_snapshot = EXCLUDED.device_snapshot,
        technician_snapshot = EXCLUDED.technician_snapshot,
        checks_snapshot = EXCLUDED.checks_snapshot,
        steps_snapshot = EXCLUDED.steps_snapshot,
        parts_snapshot = EXCLUDED.parts_snapshot,
        sync_status = 'received'
      RETURNING id, external_id
    `, [
      protocol.id || null,
      protocol.order_id,
      protocol.technician_id || null,
      protocol.client_id || null,
      protocol.device_id || null,
      protocol.template_name || 'Standardowy protokół',
      protocol.template_version || 1,
      issuedAt,
      createdAt,
      updatedAt,
      protocol.acceptance_clause || '',
      protocol.summary_text || '',
      protocol.notes || '',
      toJson(protocol.service_company_snapshot),
      toJson(protocol.client_snapshot),
      toJson(protocol.device_snapshot),
      toJson(protocol.technician_snapshot),
      toJson(protocol.checks_snapshot),
      toJson(protocol.steps_snapshot),
      toJson(protocol.parts_snapshot)
    ])

    const row = result.rows[0]
    let pdfStored = false
    let pdfPath = null
    let pdfFileName = null

    if (pdf && pdf.base64) {
      try {
        const storageDir = path.join(process.cwd(), 'storage', 'protocols')
        await ensureDirectory(storageDir)
        const fileName = sanitizeFileName(pdf.filename)
        const finalName = row && row.id ? `protocol_${row.id}_${fileName}` : fileName
        const outputPath = path.join(storageDir, finalName)
        const buffer = Buffer.from(pdf.base64, 'base64')
        await fsp.writeFile(outputPath, buffer)
        pdfStored = true
        pdfPath = outputPath
        pdfFileName = finalName

        await db.query(
          'UPDATE service_protocols SET pdf_storage_path = $1, pdf_filename = $2, pdf_uploaded = true WHERE id = $3',
          [outputPath, finalName, row.id]
        )
      } catch (error) {
        console.error('❌ Failed to store protocol PDF:', error)
      }
    }

    res.json({
      success: true,
      data: {
        id: row.id,
        externalId: row.external_id,
        pdfStored,
        pdfPath,
        pdfFileName
      }
    })
  } catch (error) {
    console.error('❌ Protocol sync error:', error)
    res.status(500).json({ success: false, error: error?.message || 'protocol-sync-failed' })
  }
})

module.exports = router

