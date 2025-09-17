import api from './client';

// Explicit opt-in: connect WP site to remote service and store API key on server
// Explicit opt-in: connect account.
// - In WP plugin context: POST /connect without body (server uses admin email)
// - In web app context (BFF): POST /connect with { email } payload
export async function connectAccount(payload) {
  const { data } = await api.post('/connect', payload || undefined);
  return data; // { ok: true } or { requires_consent: true, email: string }
}

// WordPress consent endpoint - called when user gives consent in WP context
export async function giveConsent() {
  const { data } = await api.post('/consent', { consent: true });
  return data; // { ok: true, auto_connected: true, user: {...} }
}

// Check connection status (whether API key exists server-side)
export async function getConnectionStatus() {
  const { data } = await api.get('/status');
  return data; // { connected: boolean }
}

export async function disconnectAccount() {
  const { data } = await api.post('/disconnect');
  return data; // { ok: true }
}

export async function deleteAccount() {
  const { data } = await api.delete('/delete-account');
  return data; // { ok: true }
}

// User profile (debug/user context)
export async function getUserProfile() {
  const { data } = await api.get('/users/profile');
  return data; // { user: { id, email, plan, apiKey?, ... } }
}

// Verification flows
export async function sendVerification(email) {
    const { data } = await api.post('/users/send-verification', { email });
    return data; // { ok: true }
}

export async function confirmVerification(token) {
    const { data } = await api.get('/users/verify', { params: { token } });
    return data; // { ok: true, user: { id, email, api_key } }
}

// Healthcheck
export async function getHealth() {
  const { data } = await api.get('/health');
  return data; // { ok: true }
}

export async function refreshAuth() {
  // On considère tout 2xx comme un refresh OK.
  const res = await api.post('/auth/refresh');
  // Si le backend renvoie un body, on le propage. Sinon, on normalise { ok:true }.
  const data = res?.data ?? {};
  return { ok: true, ...data };
}

// Create a new scan
export async function startScan({ site, includeMenus = true, includeWidgets = true } = {}) {
  const { data } = await api.post('/scans', { site, includeMenus, includeWidgets });
  // { id, status, startedAt }
  return data;
}

// List scans (history)
export async function listScans({ page = 1, perPage = 20, status } = {}) {
  const params = { page, perPage, status };
  Object.keys(params).forEach((k) => (params[k] == null || params[k] === '') && delete params[k]);
  const { data } = await api.get('/scans', { params });
  // { items: [...], total, page, perPage }
  return data;
}

// Get scan status/progress
export async function getScan(id) {
  const { data } = await api.get(`/scans/${id}`);
  // { id, status, processedLinks, totalLinks }
  return data;
}

// Cancel a running scan (optional)
export async function cancelScan(id) {
  const { data } = await api.post(`/scans/${id}/cancel`);
  return data;
}

// Fetch links for a scan (results)
export async function getScanResults(
  id,
  { page = 1, perPage = 50, type, status, search, sortBy, sortDir, grouped = true } = {},
) {
  const params = { page, perPage, type, status, search, sortBy, sortDir, grouped };
  Object.keys(params).forEach((k) => (params[k] == null || params[k] === '') && delete params[k]);
  const { data } = await api.get(`/scans/${id}/links`, { params });
  // { items: [{ url, type, status, sources, sourceCount, httpCode }...], total, page, perPage, grouped }
  return data;
}

// Download a report (PDF)
export async function downloadScanReport(id) {
  return api.get(`/scans/${id}/report`, { responseType: 'blob', headers: { Accept: 'application/pdf' } });
}

// Clear all scans (dangerous)
export async function clearScans() {
  const { data } = await api.delete('/scans');
  return data;
}

// Plans
export async function getPlans() {
  const { data } = await api.get('/plans');
  // { items: [{ id, title, price, currency, features[], recommended? }] }
  return data;
}

// Subscription
export async function getSubscription() {
  const { data } = await api.get('/me/subscription');
  // { plan, renewsAt? }
  return data;
}

export async function updateSubscription(plan) {
  const { data } = await api.post('/me/subscription', { plan });
  // { plan } or { plan: 'pro', checkoutUrl }
  return data;
}

export async function cancelSubscription() {
  // Backend expects a single endpoint with plan='free' to schedule cancellation
  const { data } = await api.post('/me/subscription', { plan: 'free' });
  return data;
}

export async function resumeSubscription() {
  // Backend expects a single endpoint with action='resume' to revert cancellation
  const { data } = await api.post('/me/subscription', { action: 'resume' });
  return data;
}

// Billing — create an Embedded Checkout session (client_secret)
export async function createEmbeddedCheckoutSession({ plan = 'pro', returnUrl } = {}) {
  // Expected backend response: { clientSecret: '...' }
  const payload = { plan, uiMode: 'embedded' };
  if (returnUrl) payload.returnUrl = returnUrl;
  const { data } = await api.post('/billing/checkout/session', payload);
  return data;
}

// ------------------------------------------------------------
// Schedules (frontend-first with backend fallback)
// ------------------------------------------------------------

// Local fallback helpers
function loadLocalSchedules() {
  try {
    const raw = localStorage.getItem('wpls.schedules');
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function saveLocalSchedules(items) {
  try {
    localStorage.setItem('wpls.schedules', JSON.stringify(items));
  } catch (_) {
    // ignore
  }
}

function makeLocalId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function tryRequest(promiseFactory, fallback) {
  try {
    const { data } = await promiseFactory();
    return data;
  } catch (err) {
    // If backend not ready (404/501/Network), use fallback
    if (!err.response || [404, 501].includes(err.response?.status)) {
      return fallback();
    }
    throw err;
  }
}

// List schedules
export async function listSchedules() {
  return tryRequest(
    () => api.get('/schedules'),
    () => ({ items: loadLocalSchedules() })
  );
}

// Create schedule
export async function createSchedule(payload) {
  return tryRequest(
    () => api.post('/schedules', payload),
    () => {
      const items = loadLocalSchedules();
      const now = new Date().toISOString();
      const item = { id: makeLocalId(), active: true, createdAt: now, ...payload };
      items.push(item);
      saveLocalSchedules(items);
      return item;
    }
  );
}

// Update schedule
export async function updateSchedule(id, payload) {
  return tryRequest(
    () => api.put(`/schedules/${id}`, payload),
    () => {
      const items = loadLocalSchedules();
      const idx = items.findIndex((s) => s.id === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...payload };
        saveLocalSchedules(items);
        return items[idx];
      }
      throw new Error('Schedule not found');
    }
  );
}

// Delete schedule
export async function deleteSchedule(id) {
  return tryRequest(
    () => api.delete(`/schedules/${id}`),
    () => {
      const items = loadLocalSchedules();
      const next = items.filter((s) => s.id !== id);
      saveLocalSchedules(next);
      return { ok: true };
    }
  );
}

// Clear executed one-time schedules history
export async function clearScheduleHistory() {
  try {
    const { data } = await api.delete('/schedules/history');
    return data;
  } catch (err) {
    // No local fallback; history is only server-side meaningful
    throw err;
  }
}

// Billing — create a Hosted Checkout session (URL)
export async function createHostedCheckoutSession({ plan = 'pro', successUrl, cancelUrl } = {}) {
  const payload = { plan };
  if (successUrl) payload.successUrl = successUrl;
  if (cancelUrl) payload.cancelUrl = cancelUrl;
  const { data } = await api.post('/billing/checkout/session/hosted', payload);
  return data; // { url }
}

// Settings — scan defaults
export async function getScanDefaults() {
  const { data } = await api.get('/settings/scan-defaults');
  // { includeMenus, includeWidgets }
  return data;
}

export async function updateScanDefaults(payload) {
  const { data } = await api.put('/settings/scan-defaults', payload);
  return data;
}
