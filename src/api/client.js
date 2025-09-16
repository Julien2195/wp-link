import axios from 'axios';

// Detect runtime context
const isBrowser = typeof window !== 'undefined';
const isWpPluginContext = isBrowser && !!window.LINK_FIXER_SETTINGS;
const isWebAppContext = !isWpPluginContext;

// Base URL selection
const PROXY_BASE = '/wp-json/link-fixer/v1';
const ENV_BASE = import.meta.env.VITE_API_BASE_URL;
// Normalize base: ensure leading '/' for relative bases to avoid resolving under current path
const RAW_BASE = isWpPluginContext ? PROXY_BASE : (ENV_BASE || PROXY_BASE);
const NORM_BASE = (RAW_BASE && !/^https?:\/\//i.test(RAW_BASE) && RAW_BASE[0] !== '/') ? ('/' + RAW_BASE) : RAW_BASE;
export const BASE_URL = (NORM_BASE || PROXY_BASE).replace(/\/$/, '');

// Client identification for support/observability
const CLIENT_NAME = isWpPluginContext ? 'linkfixer-wp' : (import.meta.env.VITE_CLIENT_LABEL || 'linkfixer-web');
const CLIENT_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

function readCookie(name) {
  if (!isBrowser) return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client': CLIENT_NAME,
    'X-Client-Version': CLIENT_VERSION,
  },
  // Always include cookies (WP REST cookie auth or BFF HttpOnly tokens)
  withCredentials: true,
  timeout: 15000,
});

// Request interceptor: attach context-specific headers safely.
api.interceptors.request.use((config) => {
  const headers = { ...(config.headers || {}) };

  // Locale header for backend translations (optional)
  try {
    const lang = isBrowser ? localStorage.getItem('wpls.language') : null;
    if (lang && (lang === 'en' || lang === 'fr')) {
      headers['X-Locale'] = lang;
    }
  } catch (_) {}

  // Never attach or forward API keys from the browser
  delete headers['Authorization'];
  delete headers['authorization'];
  delete headers['X-API-Key'];
  delete headers['x-api-key'];

  // WordPress REST nonce (cookie authentication) in plugin context
  if (isWpPluginContext) {
    const wpNonce = (isBrowser && ((window.wpApiSettings && window.wpApiSettings.nonce) || (window.LINK_FIXER_SETTINGS && window.LINK_FIXER_SETTINGS.restNonce))) || null;
    if (wpNonce) headers['X-WP-Nonce'] = wpNonce;
  }

  // Double-submit CSRF in web app context: lf_csrf cookie -> x-lf-csrf header
  if (isWebAppContext) {
    const method = String(config.method || 'get').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrf = readCookie('lf_csrf');
      if (csrf) headers['x-lf-csrf'] = csrf;
    }
  }

  config.headers = headers;
  return config;
});

export default api;
