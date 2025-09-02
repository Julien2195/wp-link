import React from 'react';
import { useSubscription } from '../hooks/useSubscription.js';

export default function PlanLimits({ onUpgrade }) {
  const { isPro, isFree, maxUrlsPerScan } = useSubscription();

  if (isPro) {
    return (
      <div className="plan-limits plan-limits--pro">
        <div className="plan-badge plan-badge--pro">
          <span className="icon">⭐</span>
          <span>Plan Pro</span>
        </div>
        <div className="plan-info">
          <p>Scans illimités • URLs illimitées par scan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="plan-limits plan-limits--free">
      <div className="plan-badge plan-badge--free">
        <span className="icon">🔒</span>
        <span>Plan Gratuit</span>
      </div>
      
      <div className="plan-info">
        <div className="urls-limit">
          <span className="limit-text">Maximum {maxUrlsPerScan} URLs par scan</span>
        </div>
      </div>

      <button 
        className="btn-upgrade" 
        onClick={onUpgrade}
        type="button"
      >
        Passer au Pro
      </button>
    </div>
  );
}
