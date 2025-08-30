import React, { useEffect, useState } from 'react';
import '../../styles/Plans.scss';
import { getPlans, updateSubscription } from '../api/endpoints.js';

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
            <li key={f}><Check />{f}</li>
          ))}
        </ul>
      </div>
      <div className="cta">
        <button className={`btn ${variant === 'pro' ? 'primary' : ''}`} onClick={onClick}>{cta}</button>
      </div>
    </div>
  );
}

export default function Plans({ onSelect }) {
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
        setError('Impossible de charger les offres');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const formatPrice = (price, currency) => {
    if (!price) return '0 € / mois';
    if (currency === 'EUR') return `${price} € / mois`;
    return `${price} ${currency} / mo`;
  };

  const onSelectPlan = async (planId) => {
    try {
      const res = await updateSubscription(planId);
      if (res?.checkoutUrl) {
        window.open(res.checkoutUrl, '_blank');
      }
      onSelect?.(res?.plan || planId);
    } catch (e) {
      // ignore for now
    }
  };

  return (
    <div className="section">
      <div className="panel">
        <div className="panel-header">
          <h3>Offres</h3>
          <p>Choisissez l’offre qui vous convient.</p>
        </div>
        <div className="panel-body">
          {loading && <p>Chargement…</p>}
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
                    cta={p.price > 0 ? 'Choisir ce plan' : 'Choisir'}
                    variant={p.recommended ? 'pro' : 'default'}
                    badge={p.recommended ? 'Recommandé' : undefined}
                    onClick={() => onSelectPlan(p.id)}
                  />
                ))
              ) : (
                <>
                  <PlanCard
                    title="Gratuit"
                    price="0 € / mois"
                    features={['Scan limité (ex: 100 liens / scan)', 'Historique basique']}
                    cta="Essayer gratuitement"
                    onClick={() => onSelectPlan('free')}
                  />
                  <PlanCard
                    title="Pro"
                    price="7 € / mois"
                    features={[
                      'Scans illimités',
                      'Génération de rapport PDF',
                      'Tâches planifiées (cron hebdo)',
                      'Support prioritaire',
                    ]}
                    cta="Passer en Pro"
                    variant="pro"
                    badge="Recommandé"
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
