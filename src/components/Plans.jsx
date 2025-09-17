import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/Plans.scss';
import { getPlans, updateSubscription } from '../api/endpoints.js';
import LoadingIndicator from './LoadingIndicator.jsx';

function Check() {
  return <span className="check">✔</span>;
}

function PlanCard({ title, price, features, badge, cta, variant = 'default', onClick }) {
  return (
    <div className={`plan-card ${variant === 'pro' ? 'pro' : ''}`}>
      <div className="head">
        <h3 className="title">
          {title}
          {badge && <span className="badge-reco">{badge}</span>}
        </h3>
        <p className="price">{price}</p>
      </div>
      <div className="features">
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {features.map((f) => (
            <li key={f}>
              <Check /> {f}
            </li>
          ))}
        </ul>
      </div>
      <div className="cta">
        <button className={`btn ${variant === 'pro' ? 'primary' : ''}`} onClick={onClick}>
          {cta}
        </button>
      </div>
    </div>
  );
}

export default function Plans({ onSelect }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getPlans();
        if (!mounted) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        if (!mounted) return;
        setError(t('payment.errorLoadingPlans'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [t]);

  const formatPrice = (price, currency) => {
    if (!price) return t('payment.freePerMonth');
    if (currency === 'EUR') return t('payment.priceEurPerMonth', { price });
    return t('payment.priceGenericPerMonth', { price, currency });
  };

  const onSelectPlan = async (planId) => {
    try {
      const res = await updateSubscription(planId);
      if (res?.checkoutUrl) {
        window.open(res.checkoutUrl, '_blank');
      }
      onSelect?.(res?.plan || planId);
    } catch {
      // ignore for now
    }
  };

  return (
    <div className="section">
      <div className="panel">
        <div className="panel-header">
          <h3>{t('payment.title')}</h3>
          <p>{t('payment.description')}</p>
        </div>
        <div className="panel-body">
          {loading && <LoadingIndicator block size="lg" />}
          {error && <p className="error">{error}</p>}
          {!loading && !error && (
            <div className="plans-grid">
              {items.length > 0 ? (
                items.map((p) => (
                  <PlanCard
                    key={p.id}
                    title={p.title}
                    price={formatPrice(p.price, p.currency)}
                    features={p.features || []}
                    cta={p.price > 0 ? t('payment.choosePlan') : t('payment.chooseFree')}
                    variant={p.recommended ? 'pro' : 'default'}
                    badge={p.recommended ? t('payment.recommended') : undefined}
                    onClick={() => onSelectPlan(p.id)}
                  />
                ))
              ) : (
                <>
                  <PlanCard
                    title={t('payment.freeTitle')}
                    price={t('payment.freePrice')}
                    features={[
                      t('payment.features.limitedScan'),
                      t('payment.features.basicHistory'),
                    ]}
                    cta={t('payment.tryFree')}
                    onClick={() => onSelectPlan('free')}
                  />
                  <PlanCard
                    title={t('payment.proTitle')}
                    price={t('payment.proPrice')}
                    features={[
                      t('payment.features.unlimitedScans'),
                      t('payment.features.pdfReports'),
                      t('payment.features.scheduledTasks'),
                      t('payment.features.prioritySupport'),
                    ]}
                    cta={t('payment.upgradePro')}
                    variant="pro"
                    badge={t('payment.recommended')}
                    onClick={() => onSelectPlan('pro')}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
