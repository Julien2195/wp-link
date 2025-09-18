import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription.js';
import PlanLimits from './PlanLimits.jsx';
import '../../styles/ScanForm.scss';

export default function ScanForm({ onScan, scanning, onChange, onUpgrade, site, includeMenus = true, includeWidgets = true }) {
  const { t } = useTranslation();
  const { isFree, maxUrlsPerScan } = useSubscription();
  const isWpPluginContext = typeof window !== 'undefined' && !!window.LINK_FIXER_SETTINGS;

  // Basic URL validation for web mode to prevent surprising scans on current origin
  const looksUrl = (s) => /^https?:\/\/[^\s]+$/i.test(s || '');
  const looksHost = (s) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test((s || '').replace(/^https?:\/\//i, ''));
  const canStart = isWpPluginContext || (!!site && (looksUrl(site) || looksHost(site)));

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>{t('dashboard.scanForm.globalScan')}</h3>
        <p>{t('dashboard.scanForm.globalScanDescription')}</p>
        {isFree && <PlanLimits onUpgrade={onUpgrade} />}
      </div>
      <div className="panel-body form-grid">
        {!isWpPluginContext && (
          <div className="form-row">
            <label htmlFor="lf-site" style={{ fontWeight: 600 }}>
              Domaine à analyser
            </label>
            <input
              id="lf-site"
              type="url"
              inputMode="url"
              placeholder="https://mon-site.com"
              value={site || ''}
              onChange={(e) => onChange?.({ site: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-bg)'
              }}
            />
          </div>
        )}
        <div className="form-row">
          <label className="switch">
            <input
              type="checkbox"
              checked={!!includeMenus}
              onChange={(e) => onChange?.({ includeMenus: !!e.target.checked })}
            />
            <span>{t('dashboard.scanForm.includeMenus')}</span>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={!!includeWidgets}
              onChange={(e) => onChange?.({ includeWidgets: !!e.target.checked })}
            />
            <span>{t('dashboard.scanForm.includeWidgets')}</span>
          </label>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={onScan} disabled={scanning || !canStart}>
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
