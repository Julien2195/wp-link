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
try {
    const token = localStorage.getItem('wpls.token');
    if (token) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }

    // Attach current UI locale for backend translations
    const lang = localStorage.getItem('wpls.language');
    if (lang && (lang === 'en' || lang === 'fr')) {
      config.headers = { ...config.headers, 'X-Locale': lang };
    }
  } catch (_) {
    // ignore
  }

    // Utiliser la clé API pour l'authentification
    if (typeof window !== 'undefined' && window.WPLS_SETTINGS && window.WPLS_SETTINGS.apiKey) {
        config.headers = { ...config.headers, 'X-API-Key': window.WPLS_SETTINGS.apiKey };
    }

  // WordPress REST can require a nonce header
  // If you enqueue with wp_localize_script and expose wpApiSettings.nonce
  const wpNonce = (typeof window !== 'undefined' && window.wpApiSettings && window.wpApiSettings.nonce) || null;
  if (wpNonce) {
    config.headers = { ...config.headers, 'X-WP-Nonce': wpNonce };
  }

  return config;
});

export default api;
