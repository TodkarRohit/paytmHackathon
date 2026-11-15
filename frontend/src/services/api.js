/**
 * Paytm AI Sales Teammate - API Service Layer
 * Reusable HTTP client communicating with backend REST endpoints.
 * Includes JWT session management and automated Bearer token attachment.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const TOKEN_STORAGE_KEY = 'paytm_sales_session_token'

/**
 * Retrieve session JWT token from browser sessionStorage.
 * sessionStorage is isolated per tab and cleared on tab closure,
 * avoiding permanent disk persistence or cross-tab token leakage.
 */
export function getAuthToken() {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Persist session JWT token to sessionStorage.
 */
export function setAuthToken(token) {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  } catch {}
}

/**
 * Remove session JWT token.
 */
export function clearAuthToken() {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {}
}

/**
 * Common request helper with automatic Bearer token injection and error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const token = options.token || getAuthToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const config = {
    ...options,
    headers,
  }

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body)
  }

  let response
  try {
    response = await fetch(url, config)
  } catch (netErr) {
    throw new Error(`Network error connecting to backend: ${netErr.message}`)
  }

  let result
  try {
    result = await response.json()
  } catch {
    result = null
  }

  if (!response.ok) {
    const errorMsg =
      result?.message ||
      result?.error ||
      `Request failed with status ${response.status} (${response.statusText})`
    const error = new Error(errorMsg)
    error.status = response.status
    error.data = result
    error.isAuthError = response.status === 401 || response.status === 403
    throw error
  }

  return result
}

/**
 * Build URL query string from object, skipping empty/undefined values
 */
function buildQueryString(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val)
    }
  })
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

// 0. Authentication API
export const authAPI = {
  login: (credentials) =>
    request('/auth/login', { method: 'POST', body: credentials }),
  demoLogin: (role = 'Agent') =>
    request('/auth/demo-login', { method: 'POST', body: { role } }),
  getMe: () => request('/auth/me'),
}

/**
 * Initialize or ensure an authenticated session for development/demo.
 * If no session token exists, obtains a non-privileged demo Agent token.
 */
export async function ensureAuthenticatedSession() {
  const existingToken = getAuthToken()
  if (existingToken) return existingToken

  try {
    // Attempt Admin login for operations oversight in demo
    const adminRes = await authAPI.login({
      email: 'admin@paytm-sales.local',
      password: 'PaytmAdmin@2026',
      role: 'Admin',
    })
    const token = adminRes?.data?.token
    if (token) {
      setAuthToken(token)
      return token
    }
  } catch {
    // Fall back to demo Agent if admin credentials differ
    try {
      const res = await authAPI.demoLogin('Agent')
      const token = res?.data?.token
      if (token) {
        setAuthToken(token)
        return token
      }
    } catch (demoErr) {
      console.warn('Could not establish initial demo session:', demoErr.message)
    }
  }
  return null
}

// 1. Health API (public)
export const healthAPI = {
  checkHealth: () => request('/health'),
}

// 2. Dashboard API (authenticated)
export const dashboardAPI = {
  getStats: () => request('/dashboard/stats'),
}

// 3. Shopkeeper APIs
export const shopkeeperAPI = {
  getAll: (params) => request(`/shopkeepers${buildQueryString(params)}`),
  getById: (id) => request(`/shopkeepers/${id}`),
  create: (data) => request('/shopkeepers', { method: 'POST', body: data }),
  update: (id, data) => request(`/shopkeepers/${id}`, { method: 'PATCH', body: data }),
  delete: (id) => request(`/shopkeepers/${id}`, { method: 'DELETE' }),
}

// 4. Leads APIs
export const leadAPI = {
  getAll: (params) => request(`/leads${buildQueryString(params)}`),
  getById: (id) => request(`/leads/${id}`),
  create: (data) => request('/leads', { method: 'POST', body: data }),
  update: (id, data) => request(`/leads/${id}`, { method: 'PATCH', body: data }),
  updateStatus: (id, leadStatus) =>
    request(`/leads/${id}/status`, { method: 'PATCH', body: { leadStatus } }),
  delete: (id) => request(`/leads/${id}`, { method: 'DELETE' }),
}

// 5. Campaigns APIs
export const campaignAPI = {
  getAll: (params) => request(`/campaigns${buildQueryString(params)}`),
  getById: (id) => request(`/campaigns/${id}`),
  create: (data) => request('/campaigns', { method: 'POST', body: data }),
  update: (id, data) => request(`/campaigns/${id}`, { method: 'PATCH', body: data }),
  delete: (id) => request(`/campaigns/${id}`, { method: 'DELETE' }),
}

// 6. Sales Agents APIs
export const agentAPI = {
  getAll: (params) => request(`/agents${buildQueryString(params)}`),
  getById: (id) => request(`/agents/${id}`),
  getLeads: (id) => request(`/agents/${id}/leads`),
  create: (data) => request('/agents', { method: 'POST', body: data }),
  update: (id, data) => request(`/agents/${id}`, { method: 'PATCH', body: data }),
  delete: (id) => request(`/agents/${id}`, { method: 'DELETE' }),
  assignLead: (payload) => request('/agents/assign', { method: 'POST', body: payload }),
}

// 7. Conversations APIs
export const conversationAPI = {
  chat: (payload) => request('/conversations/chat', { method: 'POST', body: payload }),
  getAll: (params) => request(`/conversations${buildQueryString(params)}`),
  getById: (id) => request(`/conversations/${id}`),
}

// 8. CRM Outbound Pipeline APIs
export const crmAPI = {
  getLeads: (params) => request(`/crm/leads${buildQueryString(params)}`),
  createLead: (data) => request('/crm/leads', { method: 'POST', body: data }),
  updateLead: (id, data) => request(`/crm/leads/${id}`, { method: 'PATCH', body: data }),
  deleteLead: (id) => request(`/crm/leads/${id}`, { method: 'DELETE' }),
  dispatchAll: () => request('/crm/dispatch-all', { method: 'POST' }),
  runCadence: () => request('/crm/run-cadence', { method: 'POST' }),
  clear: () => request('/crm/clear', { method: 'POST' }),
}

// 9. AI Training Studio APIs
export const aiTrainingAPI = {
  getConfig: () => request('/ai-training'),
  saveConfig: (data) => request('/ai-training', { method: 'POST', body: data }),
  testChat: (data) => request('/ai-training/test-chat', { method: 'POST', body: data }),
  reset: () => request('/ai-training/reset', { method: 'POST' }),
}

// 9. Twilio WhatsApp APIs
export const twilioAPI = {
  getStatus: () => request('/twilio/status'),
  sendWhatsApp: (payload) => request('/twilio/send', { method: 'POST', body: payload }),
  simulateIncoming: (payload) => request('/twilio/simulate-incoming', { method: 'POST', body: payload }),
}
