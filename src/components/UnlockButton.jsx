import React, { useState } from 'react';
import { updateSubscription } from '../api/endpoints.js';

export default function UnlockButton({ label = 'Debloquer toutes les fonctionnalités', className = '', onClick }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    // If a custom click handler is provided (e.g., to open a modal), use it.
    if (typeof onClick === 'function') {
      onClick();
      return;
    }
    // Fallback: direct to subscription checkout
    setLoading(true);
    try {
      const res = await updateSubscription('pro');
      if (res?.checkoutUrl) {
        window.open(res.checkoutUrl, '_blank');
      }
    } catch (_) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className={`btn primary large ${className}`} onClick={handleClick} disabled={loading}>
      {loading ? 'Chargement…' : label}
    </button>
  );
}
