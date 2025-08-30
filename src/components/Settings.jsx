import React, { useState } from 'react';
import UnlockButton from './UnlockButton.jsx';
import UpgradeModal from './UpgradeModal.jsx';
import PaymentModal from './PaymentModal.jsx';
import { createEmbeddedCheckoutSession, createHostedCheckoutSession } from '../api/endpoints.js';

export default function Settings({ theme, onChangeTheme }) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [checkoutSecret, setCheckoutSecret] = useState(null);
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Paramètres</h3>
        <p>Personnalisez l’apparence et les préférences.</p>
      </div>
      <div className="panel-body">
        <div className="unlock-cta" style={{ marginBottom: 16 }}>
          <UnlockButton onClick={() => setShowUpgrade(true)} />
        </div>
        <div className="form-grid">
          <div>
            <label>Thème</label>
            <div className="form-row">
              <label className="switch">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === 'system'}
                  onChange={() => onChangeTheme('system')}
                />
                <span>Système</span>
              </label>
              <label className="switch">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === 'light'}
                  onChange={() => onChangeTheme('light')}
                />
                <span>Clair</span>
              </label>
              <label className="switch">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === 'dark'}
                  onChange={() => onChangeTheme('dark')}
                />
                <span>Sombre</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      {showUpgrade && (
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          onProceedPayment={async (plan) => {
            const current = (typeof window !== 'undefined' && window.location) ? window.location.href.split('#')[0] : '';
            const sep = current.includes('?') ? '&' : '?';
            const returnUrl = current ? `${current}${sep}checkout_return=1&session_id={CHECKOUT_SESSION_ID}` : undefined;
            const successUrl = current ? `${current}${sep}checkout_success=1&session_id={CHECKOUT_SESSION_ID}` : undefined;
            const cancelUrl = current ? `${current}${sep}checkout_cancel=1` : undefined;

            // 1) Try Embedded Checkout
            try {
              const { clientSecret } = await createEmbeddedCheckoutSession({ plan: plan || 'pro', returnUrl });
              if (clientSecret) {
                setCheckoutSecret(clientSecret);
                setShowUpgrade(false);
                setShowPayment(true);
                return;
              }
            } catch (e) {
              console.warn('Embedded Checkout indisponible:', e?.message || e);
            }
            // 2) Fallback Hosted Checkout
            try {
              const { url } = await createHostedCheckoutSession({ plan: plan || 'pro', successUrl, cancelUrl });
              if (url) {
                setShowUpgrade(false);
                window.location.assign(url);
                return;
              }
            } catch (err) {
              console.error('Hosted Checkout indisponible:', err);
            }
            // 3) No client-only fallback
            alert('Impossible de démarrer le paiement pour le moment.');
          }}
        />
      )}

      {showPayment && (
        <PaymentModal
          open={showPayment}
          onClose={() => { setShowPayment(false); setCheckoutSecret(null); }}
          checkoutClientSecret={checkoutSecret}
        />
      )}
    </div>
  );
}
