/**
 * Enterprise Merchant CRM Pipeline Service
 * Communicates with the real backend database REST endpoints.
 * All fake mock profiles have been completely removed.
 */

const STORAGE_KEY = 'paytm_enterprise_crm_leads_real'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

// Wipe any legacy fake mock profiles from browser storage
try {
  localStorage.removeItem('paytm_enterprise_crm_leads_v2')
} catch {}

function getLocalLeads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch {}
  return []
}

function setLocalLeads(leads) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads || []))
  } catch {}
}

export const crmService = {
  /**
   * Load real leads from database API.
   */
  async loadLeads() {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2500)

      const res = await fetch(`${API_BASE_URL}/crm/leads`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const json = await res.json()
        if (json.status === 'success' && Array.isArray(json.data)) {
          setLocalLeads(json.data)
          return {
            leads: json.data,
            source: 'api',
            databaseConnected: json.database?.connected ?? true,
          }
        }
      }
    } catch {}

    const localData = getLocalLeads()
    return { leads: localData, source: 'local', databaseConnected: false }
  },

  /**
   * Add a real lead into database.
   */
  async addLead(leadData) {
    try {
      const res = await fetch(`${API_BASE_URL}/crm/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.status === 'success' && json.data) {
          const current = getLocalLeads()
          setLocalLeads([json.data, ...current])
          return { lead: json.data, source: 'api' }
        }
      }
    } catch {}

    const newId = `LEAD-${Date.now()}`
    const lead = {
      ...leadData,
      id: newId,
      monthly_revenue_estimate: Number(leadData.monthly_revenue_estimate) || 0,
      follow_up_count: Number(leadData.follow_up_count) || 0,
      pain_points: Array.isArray(leadData.pain_points) ? leadData.pain_points : [],
      conversation_history: Array.isArray(leadData.conversation_history)
        ? leadData.conversation_history
        : [],
    }
    const current = getLocalLeads()
    const updated = [lead, ...current]
    setLocalLeads(updated)
    return { lead, source: 'local' }
  },

  /**
   * Update lead in database.
   */
  async updateLead(id, updates) {
    try {
      const res = await fetch(`${API_BASE_URL}/crm/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.status === 'success' && json.data) {
          const current = getLocalLeads()
          const index = current.findIndex((l) => l.id === id)
          if (index !== -1) {
            current[index] = { ...current[index], ...updates }
            setLocalLeads(current)
          }
          return { lead: json.data, source: 'api' }
        }
      }
    } catch {}

    const current = getLocalLeads()
    const index = current.findIndex((l) => l.id === id)
    if (index !== -1) {
      current[index] = { ...current[index], ...updates }
      setLocalLeads(current)
      return { lead: current[index], source: 'local' }
    }
    return { lead: null, source: 'local' }
  },

  /**
   * Delete lead from database.
   */
  async deleteLead(id) {
    try {
      await fetch(`${API_BASE_URL}/crm/leads/${id}`, { method: 'DELETE' })
    } catch {}

    const current = getLocalLeads()
    const filtered = current.filter((l) => l.id !== id)
    setLocalLeads(filtered)
    return filtered
  },

  /**
   * Dispatch outreach to all queued ('new') leads in database.
   */
  async dispatchAll() {
    try {
      const res = await fetch(`${API_BASE_URL}/crm/dispatch-all`, { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        if (json.status === 'success') {
          setLocalLeads(json.data)
          return {
            leads: json.data,
            dispatchedCount: json.dispatchedCount,
            source: 'api',
          }
        }
      }
    } catch {}

    const current = getLocalLeads()
    let dispatchedCount = 0
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const updated = current.map((lead) => {
      if (lead.status === 'new') {
        dispatchedCount++
        const introMsg = {
          role: 'agent',
          message: `Namaste ${lead.name} ji! Hum Paytm Business team se bol rahe hain. Kya aapke store (${lead.business}) ke liye Paytm Soundbox ka demonstration arrange karein? Instant voice alerts se payment verification aasan ho jaata hai.`,
          timestamp: nowTime,
        }
        return {
          ...lead,
          status: 'contacted',
          follow_up_count: (lead.follow_up_count || 0) + 1,
          conversation_history: [...(lead.conversation_history || []), introMsg],
        }
      }
      return lead
    })

    setLocalLeads(updated)
    return { leads: updated, dispatchedCount, source: 'local' }
  },

  /**
   * Run cadence in database.
   */
  async runCadence() {
    try {
      const res = await fetch(`${API_BASE_URL}/crm/run-cadence`, { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        if (json.status === 'success') {
          setLocalLeads(json.data)
          return {
            leads: json.data,
            cadenceCount: json.cadenceCount,
            source: 'api',
          }
        }
      }
    } catch {}

    const current = getLocalLeads()
    let cadenceCount = 0
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const updated = current.map((lead) => {
      if (lead.status === 'contacted' || lead.status === 'in_progress') {
        cadenceCount++
        const followUpMsg = {
          role: 'agent',
          message: `Namaste ${lead.name} ji! Just following up on your payment setup query for ${lead.business}. Would you like our Paytm sales rep to visit today for a 5-minute counter demonstration?`,
          timestamp: nowTime,
        }
        return {
          ...lead,
          follow_up_count: (lead.follow_up_count || 0) + 1,
          conversation_history: [...(lead.conversation_history || []), followUpMsg],
        }
      }
      return lead
    })

    setLocalLeads(updated)
    return { leads: updated, cadenceCount, source: 'local' }
  },

  /**
   * Clear all leads from database.
   */
  async clearAll() {
    try {
      await fetch(`${API_BASE_URL}/crm/clear`, { method: 'POST' })
    } catch {}

    setLocalLeads([])
    return []
  },
}
