import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription.js';

export default function PlanLimits({ onUpgrade }) {
  const { t } = useTranslation();
  const { isPro, isFree, maxUrlsPerScan } = useSubscription();

  if (isPro) {
    return (
      <div className="plan-limits plan-limits--pro">
        <div className="plan-badge plan-badge--pro">
          <span className="icon">⭐</span>
          <span>{t('subscription.proPlan')}</span>
        </div>
        <div className="plan-info">
          <p>{t('subscription.proFeatures')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="plan-limits plan-limits--free">
      <div className="plan-badge plan-badge--free">
        <span className="icon">🔒</span>
        <span>{t('subscription.freePlan')}</span>
      </div>

      <div className="plan-info">
        <div className="urls-limit">
          <span className="limit-text">{t('subscription.urlLimit', { max: maxUrlsPerScan })}</span>
        </div>
      </div>

      <button className="btn-upgrade" onClick={onUpgrade} type="button">
        {t('subscription.upgradeToPro')}
      </button>
    </div>
  );
}
