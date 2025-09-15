import axios from 'axios';

// Prefer the WP REST proxy when running inside the WP plugin (LINK_FIXER_SETTINGS is localized by PHP).
// This ensures sensitive traffic always goes through the server-side proxy and never to a remote base directly.
const isWpPluginContext = typeof window !== 'undefined' && !!window.LINK_FIXER_SETTINGS;
const PROXY_BASE = '/wp-json/link-fixer/v1';
const ENV_BASE = import.meta.env.VITE_API_BASE_URL;
export const BASE_URL = (isWpPluginContext ? PROXY_BASE : (ENV_BASE || PROXY_BASE)).replace(/\/$/, '');

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Include cookies for WP REST cookie auth (same-origin)
  withCredentials: true,
  timeout: 15000,
});

// Optional: attach WordPress nonce if present (for REST auth),
// avoid exposing or sending any custom API keys from the browser.
api.interceptors.request.use((config) => {
  // Do not attach any API keys from client-side

  // WordPress REST nonce (cookie authentication)
  // Prefer wpApiSettings.nonce if provided, otherwise use LINK_FIXER_SETTINGS.restNonce
  const wpNonce = (typeof window !== 'undefined' && ((window.wpApiSettings && window.wpApiSettings.nonce) || (window.LINK_FIXER_SETTINGS && window.LINK_FIXER_SETTINGS.restNonce))) || null;
  if (wpNonce) {
    config.headers = { ...config.headers, 'X-WP-Nonce': wpNonce };
  }

  return config;
});

export default api;
