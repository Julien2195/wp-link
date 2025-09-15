import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription.js';
import ReportPreview from './ReportPreview.jsx';
import { listScans, getScanResults, clearScans } from '../api/endpoints.js';

export default function History({ onUpgrade }) {
  const { t } = useTranslation();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const { canAccessFeature, isFree, isPro, subscription } = useSubscription();
  const hasHistoryAccess = !isFree || canAccessFeature('scan_history');

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      setLoading(true);
      const data = await listScans({ perPage: 50 });
      setScans(data.items || []);
    } catch (error) {
      console.error('Erreur lors du chargement des scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const onClearHistory = async () => {
    if (!isPro) return; // Only Pro can clear history
    if (!confirm(t('history.confirmClear'))) return;
    try {
      await clearScans();
      await loadScans();
    } catch (e) {
      console.error("Erreur lors du nettoyage de l'historique:", e);
      alert(t('errors.clearHistory'));
    }
  };

  const openPreview = async (scan) => {
    try {
      const results = await getScanResults(scan.id, { perPage: 1000 });
      setPreview({
        scanId: scan.id,
        stats: {
          total: scan.total,
          ok: scan.ok,
          broken: scan.broken,
          redirect: scan.redirect,
          internal: 0, // Ces données ne sont pas disponibles dans la liste
          external: 0,
        },
        items: results.items || [],
      });
    } catch (error) {
      console.error('Erreur lors du chargement des résultats:', error);
    }
  };

  const formatDate = (dateString) => {
    const locale = t('locale') || 'fr-FR';
    return new Date(dateString).toLocaleString(locale);
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h3>{t('history.title')}</h3>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div
        className="panel-header"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <div>
          <h3>{t('history.title')}</h3>
          <p>{t('history.description')}</p>
        </div>
        {isPro && hasHistoryAccess && scans.length > 0 && (
          <button className="btn danger" onClick={onClearHistory}>
            {t('history.clearHistory')}
          </button>
        )}
      </div>
      <div className="panel-body">
        {/* Restriction pour les utilisateurs gratuits */}
        {isFree && !canAccessFeature('scan_history') && (
          <div className="feature-locked">
            <div className="lock-icon">🔒</div>
            <h4>{t('subscription.proFeature')}</h4>
            <p>{t('history.proFeatureDescription')}</p>
            <button className="btn primary" onClick={onUpgrade}>
              {t('subscription.upgradeToPro')}
            </button>
          </div>
        )}

        {/* Contenu normal pour les utilisateurs Pro ou si la fonctionnalité est accessible */}
        {hasHistoryAccess && scans.length === 0 && (
          <p>{t('history.noScans')}</p>
        )}

        {hasHistoryAccess && scans.length > 0 && (
          <div className="table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th>{t('history.table.date')}</th>
                  <th>{t('history.table.status')}</th>
                  <th>{t('history.table.totalLinks')}</th>
                  <th>{t('results.status.ok')}</th>
                  <th>{t('history.table.redirects')}</th>
                  <th>{t('results.status.broken')}</th>
                  <th>{t('history.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.id}>
                    <td>{formatDate(scan.startedAt || scan.createdAt)}</td>
                    <td>
                      <span className={`status-badge ${scan.status}`}>{scan.status}</span>
                    </td>
                    <td>{scan.total}</td>
                    <td>{scan.ok}</td>
                    <td>{scan.redirect}</td>
                    <td>{scan.broken}</td>
                    <td>
                      <button
                        className="btn"
                        onClick={() => openPreview(scan)}
                        disabled={scan.status === 'running' || scan.status === 'pending'}
                      >
                        {t('history.viewReport')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {preview && (
        <ReportPreview
          stats={preview.stats}
          items={preview.items}
          scanId={preview.scanId}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
