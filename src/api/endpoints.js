import api from './client';

// Healthcheck
export async function getHealth() {
  const { data } = await api.get('/health');
  return data; // { ok: true }
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

// Billing — create an Embedded Checkout session (client_secret)
export async function createEmbeddedCheckoutSession({ plan = 'pro', returnUrl } = {}) {
  // Expected backend response: { clientSecret: '...' }
  const payload = { plan, uiMode: 'embedded' };
  if (returnUrl) payload.returnUrl = returnUrl;
  const { data } = await api.post('/billing/checkout/session', payload);
  return data;
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
