import { loadStripe } from '@stripe/stripe-js';

// Publishable key (Vite exposes only VITE_* vars)
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_API_KEY;

export const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

// Stripe Checkout (client-only) configuration via env
const CHECKOUT_MODE = (import.meta.env.VITE_STRIPE_MODE || 'subscription');
const CHECKOUT_SUCCESS_URL = import.meta.env.VITE_STRIPE_SUCCESS_URL || (typeof window !== 'undefined' ? window.location.href : '');
const CHECKOUT_CANCEL_URL = import.meta.env.VITE_STRIPE_CANCEL_URL || (typeof window !== 'undefined' ? window.location.href : '');

// Per-plan config (extend if you add more plans)
const PRICE_BY_PLAN = {
  pro: import.meta.env.VITE_STRIPE_PRICE_PRO || '',
};
const PAYMENT_LINK_BY_PLAN = {
  pro: import.meta.env.VITE_STRIPE_PAYMENT_LINK_PRO || '',
};

// Start a Stripe Checkout redirect using client-only integration
// Requires a Price ID in VITE_STRIPE_PRICE_PRO and publishable key.
// Fallback: if no price is configured, but a Payment Link URL is provided,
// we simply redirect to that URL (no Stripe.js required).
export async function startCheckout({ plan = 'pro' } = {}) {
  const price = PRICE_BY_PLAN[plan];
  const paymentLink = PAYMENT_LINK_BY_PLAN[plan];

  // If no price ID, try payment link fallback (Dashboard-created)
  if (!price && paymentLink) {
    window.location.assign(paymentLink);
    return { redirected: true, via: 'payment_link' };
  }

  const stripe = await stripePromise;
  if (!stripe) {
    throw new Error('Clé Stripe manquante. Définissez VITE_STRIPE_API_KEY.');
  }
  if (!price) {
    throw new Error('Price ID manquant. Définissez VITE_STRIPE_PRICE_PRO.');
  }

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price, quantity: 1 }],
    mode: CHECKOUT_MODE,
    successUrl: CHECKOUT_SUCCESS_URL,
    cancelUrl: CHECKOUT_CANCEL_URL,
    locale: 'fr',
  });
  if (error) throw error;
  return { redirected: true, via: 'checkout' };
}
