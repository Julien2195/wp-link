import axios from 'axios';

// Base URL configurable via Vite env (e.g. VITE_API_BASE_URL=https://api.local/api)
// Fallback to '/api' so local backends at http://localhost:8000/api work by default
export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Set to true if your backend uses cookies/session on same origin
  withCredentials: false,
  timeout: 15000,
});

// Optional: attach auth/nonce if present (WordPress or custom bearer)
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('wpls.token');
    if (token) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }
  } catch (_) {
    // ignore
  }

  // WordPress REST can require a nonce header
  // If you enqueue with wp_localize_script and expose wpApiSettings.nonce
  const wpNonce = (typeof window !== 'undefined' && window.wpApiSettings && window.wpApiSettings.nonce) || null;
  if (wpNonce) {
    config.headers = { ...config.headers, 'X-WP-Nonce': wpNonce };
  }

    // Ajouter les informations du site WordPress pour identifier l'utilisateur
    if (typeof window !== 'undefined' && window.WPLS_SETTINGS) {
        const { adminEmail, siteUrl } = window.WPLS_SETTINGS;
        if (adminEmail) {
            config.headers = { ...config.headers, 'X-WP-User-Email': adminEmail };
        }
        if (siteUrl) {
            config.headers = { ...config.headers, 'X-WP-Site-URL': siteUrl };
        }
    } else {
        console.error('WPLS_SETTINGS not found:', window.WPLS_SETTINGS);
    }

  return config;
});

export default api;

