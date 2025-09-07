import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import UnlockButton from './UnlockButton.jsx';
import UpgradeModal from './UpgradeModal.jsx';
import PaymentModal from './PaymentModal.jsx';
import CancelSubscriptionButton from './CancelSubscriptionButton.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import { createEmbeddedCheckoutSession, createHostedCheckoutSession } from '../api/endpoints.js';
import { useSubscription } from '../hooks/useSubscription.js';
import Scheduler from './Scheduler.jsx';

export default function Settings({ theme, onChangeTheme }) {
  const { t, i18n } = useTranslation();
  const { isPro, isFree, subscription } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [checkoutSecret, setCheckoutSecret] = useState(null);

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>{t('settings.title')}</h3>
        <p>{t('settings.description')}</p>
      </div>
      <div className="panel-body">
        {/* Bouton upgrade seulement si version gratuite */}
        {isFree && (
          <div className="unlock-cta" style={{ marginBottom: 16 }}>
            <UnlockButton onClick={() => setShowUpgrade(true)} />
          </div>
        )}

        {/* Informations sur l'abonnement actuel */}
        {subscription && (
          <div
            style={{
              marginBottom: 24,
              padding: 16,
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 8,
            }}
          >
            <h4 style={{ margin: '0 0 8px 0' }}>{t('settings.subscription.current')}</h4>
            <p style={{ margin: '0 0 8px 0' }}>
              {t('settings.subscription.plan')} :{' '}
              <strong>{isPro ? t('subscription.proPlan') : t('subscription.freePlan')}</strong>
              {subscription.isCancelling && (
                <span
                  style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    color: 'var(--color-warning)',
                    fontWeight: 'normal',
                  }}
                >
                  ({t('settings.subscription.cancellationScheduled')})
                </span>
              )}
            </p>
            {subscription.renewsAt && (
              <p style={{ margin: '0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                {subscription.isCancelling
                  ? t('subscription.expiresOn')
                  : isPro
                    ? t('settings.subscription.renewal')
                    : t('subscription.expiresOn')}{' '}
                :{' '}
                {new Date(subscription.renewsAt).toLocaleDateString(
                  i18n.language === 'fr' ? 'fr-FR' : 'en-US',
                )}
              </p>
            )}

            {/* Bouton d'annulation pour les utilisateurs Pro */}
            {isPro && <CancelSubscriptionButton />}
          </div>
        )}

        <div className="form-grid">
          <div>
            <label>{t('settings.general.language')}</label>
            <div className="form-row">
              <LanguageSelector />
            </div>
          </div>

          <div>
            <label>{t('settings.general.theme')}</label>
            <div className="form-row">
              <label className="switch">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === 'system'}
                  onChange={() => onChangeTheme('system')}
                />
                <span>{t('settings.general.themes.system')}</span>
              </label>
              <label className="switch">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === 'light'}
                  onChange={() => onChangeTheme('light')}
                />
                <span>{t('settings.general.themes.light')}</span>
              </label>
              <label className="switch">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === 'dark'}
                  onChange={() => onChangeTheme('dark')}
                />
                <span>{t('settings.general.themes.dark')}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      <div className="section" style={{ marginTop: 16 }}>
        <Scheduler />
      </div>
      {showUpgrade && (
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          onProceedPayment={async (plan) => {
            const current =
              typeof window !== 'undefined' && window.location
                ? window.location.href.split('#')[0]
                : '';
            const sep = current.includes('?') ? '&' : '?';
            const returnUrl = current
              ? `${current}${sep}checkout_return=1&session_id={CHECKOUT_SESSION_ID}`
              : undefined;
            const successUrl = current
              ? `${current}${sep}checkout_success=1&session_id={CHECKOUT_SESSION_ID}`
              : undefined;
            const cancelUrl = current ? `${current}${sep}checkout_cancel=1` : undefined;

            // 1) Try Embedded Checkout
            try {
              const { clientSecret } = await createEmbeddedCheckoutSession({
                plan: plan || 'pro',
                returnUrl,
              });
              if (clientSecret) {
                setCheckoutSecret(clientSecret);
                setShowUpgrade(false);
                setShowPayment(true);
                return;
              }
            } catch (e) {
              console.error('Embedded Checkout indisponible:', e?.message || e, e);
            }
            // 2) Fallback Hosted Checkout
            try {
              const { url } = await createHostedCheckoutSession({
                plan: plan || 'pro',
                successUrl,
                cancelUrl,
              });
              if (url) {
                setShowUpgrade(false);
                window.location.assign(url);
                return;
              }
            } catch (err) {
              console.error('Hosted Checkout indisponible:', err?.message || err, err);
            }
            // 3) No client-only fallback
            alert(t('payment.errorStart'));
          }}
        />
      )}

      {showPayment && (
        <PaymentModal
          open={showPayment}
          onClose={() => {
            setShowPayment(false);
            setCheckoutSecret(null);
          }}
          checkoutClientSecret={checkoutSecret}
        />
      )}
    </div>
  );
}
