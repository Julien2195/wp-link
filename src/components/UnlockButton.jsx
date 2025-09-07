import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updateSubscription } from '../api/endpoints.js';

export default function UnlockButton({ label, className = '', onClick }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const defaultLabel = label || t('subscription.unlockFeatures');

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
      {loading ? t('common.loading') : defaultLabel}
    </button>
  );
}
