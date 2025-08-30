import React, { useState } from 'react';
import { PaymentElement, useCheckout } from '@stripe/react-stripe-js';

// Helper to validate email with Stripe Checkout client
const validateEmail = async (email, checkout) => {
  const updateResult = await checkout.updateEmail(email);
  const isValid = updateResult.type !== 'error';
  return { isValid, message: !isValid ? updateResult.error.message : null };
};

const EmailInput = ({ email, setEmail, error, setError }) => {
  const checkout = useCheckout();

  const handleBlur = async () => {
    if (!email) return;
    const { isValid, message } = await validateEmail(email, checkout);
    if (!isValid) setError(message);
  };

  const handleChange = (e) => {
    setError(null);
    setEmail(e.target.value);
  };

  return (
    <>
      <label>
        Email
        <input
          id="email"
          type="email"
          value={email}
          onChange={handleChange}
          onBlur={handleBlur}
          className={error ? 'error' : ''}
          placeholder="you@example.com"
          required
        />
      </label>
      {error && <div id="email-errors" style={{ color: 'var(--color-danger)' }}>{error}</div>}
    </>
  );
};

export default function CheckoutForm() {
  const checkout = useCheckout();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { isValid, message } = await validateEmail(email, checkout);
    if (!isValid) {
      setEmailError(message);
      setMessage(message);
      setIsLoading(false);
      return;
    }

    const confirmResult = await checkout.confirm();

    // If an immediate error occurs, it's returned here; otherwise Stripe handles redirect
    if (confirmResult.type === 'error') {
      setMessage(confirmResult.error.message);
    }

    setIsLoading(false);
  };

  const totalAmount = checkout?.total?.total?.amount;
  const currency = checkout?.total?.total?.currency?.toUpperCase?.() || 'EUR';

  return (
    <form onSubmit={handleSubmit} className="payment-form" style={{ display: 'grid', gap: 12 }}>
      <EmailInput
        email={email}
        setEmail={setEmail}
        error={emailError}
        setError={setEmailError}
      />
      <h4>Paiement</h4>
      <div style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg)' }}>
        <PaymentElement id="payment-element" />
      </div>
      <button className="btn primary" disabled={isLoading} id="submit">
        {isLoading ? 'Traitement…' : `Payer ${totalAmount ? (totalAmount / 100).toFixed(2) : ''} ${currency}`}
      </button>
      {message && <div id="payment-message" style={{ color: 'var(--color-danger)' }}>{message}</div>}
    </form>
  );
}

