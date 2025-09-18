import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import UnlockButton from './UnlockButton.jsx';
import UpgradeModal from './UpgradeModal.jsx';
import PaymentModal from './PaymentModal.jsx';
import CancelSubscriptionButton from './CancelSubscriptionButton.jsx';
import {
  createEmbeddedCheckoutSession,
  createHostedCheckoutSession,
  deleteAccount,
} from '../api/endpoints.js';
import { useSubscription } from '../hooks/useSubscription.js';

export default function Settings({ theme, onChangeTheme }) {
  const { t, i18n } = useTranslation();
  const { isPro, isFree, subscription } = useSubscription();
  const isWpPluginContext = typeof window !== 'undefined' && !!window.LINK_FIXER_SETTINGS;
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
        {/* Gestion du compte LinkFixer Cloud */}
        <div
          id="lf-consent"
          style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('connection.statusTitle')}</div>
            <div style={{ opacity: 0.85 }}>{t('connection.connected')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn danger"
              onClick={async () => {
                if (!confirm(t('connection.disconnectConfirm'))) return;
                try {
                  await deleteAccount();
                  // Redirige vers la carte de consentement pour recréer un compte
                  const w = typeof window !== 'undefined' ? window : null;
                  if (w && w.location) {
                    const { location } = w;
                    const origin = location.origin;
                    if (isWpPluginContext) {
                      const path = location.pathname;
                      const adminIndex = path.indexOf('/wp-admin/');
                      const adminBase =
                        adminIndex >= 0
                          ? origin + path.slice(0, adminIndex + '/wp-admin/'.length)
                          : origin + '/wp-admin/';
                      const target = `${adminBase}admin.php?page=linkfixer-seo`;
                      w.location.assign(target);
                    } else {
                      w.location.assign(origin || '/');
                    }
                    return;
                  }
                  alert(t('connection.disconnectSuccess'));
                } catch (_) {
                  alert(t('connection.disconnectError'));
                }
              }}
            >
              {t('connection.disconnectButton')}
            </button>
          </div>
        </div>

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
