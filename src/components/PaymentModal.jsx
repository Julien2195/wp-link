import React from 'react';
import { useTranslation } from 'react-i18next';
import { Elements, CardElement, useElements, useStripe, EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { stripePromise, STRIPE_PUBLISHABLE_KEY } from '../stripe.js';
import CheckoutForm from './CheckoutForm.jsx';

function CardPaymentForm({ plan = 'pro', onClose, onPaymentMethodCreated }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [result, setResult] = React.useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) return;

    setLoading(true);
    try {
      // Front-only: create a PaymentMethod (no charge). Your backend can confirm later.
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card,
        billing_details: {},
      });

      if (pmError) {
        setError(pmError.message || t('payment.error'));
      } else {
        setResult(paymentMethod);
        onPaymentMethodCreated?.(paymentMethod);
      }
    } catch (err) {
      setError(err?.message || t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form" style={{ display: 'grid', gap: 12 }}>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{t('payment.modal.chosenPlan')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge">{plan === 'pro' ? t('payment.proTitle') : plan}</span>
          <span style={{ opacity: 0.8 }}>{plan === 'pro' ? t('payment.proPrice') : t('payment.freePrice')}</span>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 6 }}>{t('payment.modal.cardInfo')}</label>
        <div style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg)' }}>
          <CardElement options={{ hidePostalCode: true }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>
          {t('payment.modal.testCardHint')}
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--color-danger)' }}>{error}</div>
      )}
      {result && (
        <div className="badge" style={{ color: 'var(--color-success)' }}>
          {t('payment.modal.cardValidated', { id: result.id })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" className="btn" onClick={onClose} disabled={loading}>{t('common.cancel')}</button>
        <button type="submit" className="btn primary" disabled={!stripe || loading}>
          {loading ? t('payment.modal.validating') : t('payment.modal.validateCard')}
        </button>
      </div>
    </form>
  );
}

export default function PaymentModal({ open, onClose, plan = 'pro', checkoutClientSecret, onPaymentMethodCreated }) {
  const backdropRef = React.useRef(null);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      aria-modal="true"
      role="dialog"
      aria-label={t('payment.modal.title')}
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose?.(); }}
      style={{ overflowY: 'auto' }}
    >
      <div className="modal payment-modal" style={{ width: 'min(560px, 96vw)' }}>
        <button className="modal__close" onClick={onClose} aria-label={t('common.close')}>✕</button>
        <div className="modal__header">
          <h3 className="modal__title">{t('payment.modal.title')}</h3>
          <p className="modal__subtitle">{t('payment.modal.subtitle')}</p>
        </div>
        <div className="modal__body">
          {!STRIPE_PUBLISHABLE_KEY ? (
            <div style={{ color: 'var(--color-danger)' }}>
              {t('payment.modal.missingKey')}
            </div>
          ) : checkoutClientSecret ? (
            // Embedded Checkout (EmbeddedCheckoutProvider + EmbeddedCheckout)
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret: checkoutClientSecret }}>
              <div style={{ minHeight: 600 }}>
                <EmbeddedCheckout />
              </div>
            </EmbeddedCheckoutProvider>
          ) : (
            // Fallback simple card form (PaymentMethod only)
            <Elements stripe={stripePromise}>
              <CardPaymentForm plan={plan} onClose={onClose} onPaymentMethodCreated={onPaymentMethodCreated} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
