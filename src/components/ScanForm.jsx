import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription.js';
import PlanLimits from './PlanLimits.jsx';
import '../../styles/ScanForm.scss';

export default function ScanForm({ onScan, scanning, onChange, onUpgrade }) {
  const { t } = useTranslation();
  const { isFree, maxUrlsPerScan } = useSubscription();

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>{t('dashboard.scanForm.globalScan')}</h3>
        <p>{t('dashboard.scanForm.globalScanDescription')}</p>
        {isFree && <PlanLimits onUpgrade={onUpgrade} />}
      </div>
      <div className="panel-body form-grid">
        <div className="form-row">
          <label className="switch">
            <input type="checkbox" defaultChecked onChange={() => {}} />
            <span>{t('dashboard.scanForm.includeMenus')}</span>
          </label>
          <label className="switch">
            <input type="checkbox" defaultChecked onChange={() => {}} />
            <span>{t('dashboard.scanForm.includeWidgets')}</span>
          </label>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={onScan} disabled={scanning}>
            {scanning ? t('dashboard.scanForm.scanning') : t('dashboard.scanForm.startScan')}
          </button>
          {isFree && (
            <p className="scan-limit-message">
              {t('dashboard.scanForm.limitMessage', { max: maxUrlsPerScan })}
              <button className="btn-link" onClick={onUpgrade}>
                {t('subscription.upgrade')}
              </button>
              {t('dashboard.scanForm.limitMessageEnd')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

