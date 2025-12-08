const API_BASE = (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost')
  ? 'http://localhost:5174/api'
  : 'http://127.0.0.1:5174/api'

const request = async (path, options = {}) => {
  const url = `${API_BASE}${path}`
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) {
    const error = data?.error || `Request failed (${response.status})`
    throw new Error(error)
  }
  return data
}

export const fetchProtocols = async (params = {}) => {
  const search = new URLSearchParams()
  if (params.limit) search.set('limit', params.limit)
  if (params.offset) search.set('offset', params.offset)
  if (params.orderId) search.set('orderId', params.orderId)
  const suffix = search.toString() ? `?${search.toString()}` : ''
  const data = await request(`/protocols${suffix}`)
  return data?.data || []
}

export const fetchProtocolDefaults = async () => {
  const data = await request('/protocols/defaults')
  return data?.defaults || { checks: [], acceptanceClause: '' }
}

export const fetchProtocolContext = async (orderId) => {
  if (!orderId) throw new Error('orderId required')
  const data = await request(`/protocols/context/${orderId}`)
  return data?.context || null
}

export const fetchProtocol = async (protocolId) => {
  if (!protocolId) throw new Error('protocolId required')
  const data = await request(`/protocols/${protocolId}`)
  return data?.protocol || null
}

export const createProtocol = async (payload) => {
  const data = await request('/protocols', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  })
  return data?.protocol || null
}

export const updateProtocol = async (protocolId, payload) => {
  if (!protocolId) throw new Error('protocolId required')
  const data = await request(`/protocols/${protocolId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  })
  return data?.protocol || null
}

export const exportProtocolToRailway = async (protocolId) => {
  if (!protocolId || !window?.electronAPI?.protocols) throw new Error('protocolId required')
  const result = await window.electronAPI.protocols.exportToRailway(protocolId)
  if (!result?.success) {
    throw new Error(result?.error || 'Export failed')
  }
  return result?.data || null
}

export const generateProtocolPdf = async ({ protocolId, html, fileName }) => {
  if (!protocolId || !window?.electronAPI?.protocols) throw new Error('protocolId required')
  const result = await window.electronAPI.protocols.generatePdf({ protocolId, html, fileName })
  if (!result?.success) {
    throw new Error(result?.error || 'PDF generation failed')
  }
  return result
}

export const ensureProtocolFolder = async () => {
  if (!window?.electronAPI?.protocols) return null
  const result = await window.electronAPI.protocols.ensureFolder()
  if (result?.success) return result.path
  return null
}

export const openProtocolPdf = async (filePath) => {
  if (!filePath || !window?.electronAPI?.protocols) return false
  const result = await window.electronAPI.protocols.openPdf(filePath)
  return result?.success === true
}

export const deleteProtocol = async (protocolId) => {
  if (!protocolId) throw new Error('protocolId required')
  const data = await request(`/protocols/${protocolId}`, {
    method: 'DELETE'
  })
  return data?.success === true
}

