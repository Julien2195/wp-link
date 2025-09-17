import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription.js';
import ReportPreview from './ReportPreview.jsx';
import { listScans, getScanResults, clearScans } from '../api/endpoints.js';
import LoadingIndicator from './LoadingIndicator.jsx';

export default function History({ onUpgrade }) {
  const { t } = useTranslation();
  const [scans, setScans] = useState([]);
  const [allScans, setAllScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const { canAccessFeature, isFree, isPro, subscription } = useSubscription();
  const hasHistoryAccess = !isFree || canAccessFeature('scan_history');
  const [page, setPage] = useState(1);
  const [pageSizeChoice, setPageSizeChoice] = useState('20');
  const [total, setTotal] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [serverPagination, setServerPagination] = useState(true);

  const totalForPagination = serverPagination
    ? (total || scans.length)
    : (allScans.length || total || scans.length);

  const effectivePerPage = useMemo(() => {
    if (pageSizeChoice === 'all') {
      return totalForPagination > 0 ? totalForPagination : 1000;
    }
    const parsed = Number(pageSizeChoice);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
  }, [pageSizeChoice, totalForPagination]);

  const totalPages = useMemo(() => {
    if (pageSizeChoice === 'all') {
      return 1;
    }
    const count = totalForPagination > 0 ? totalForPagination : 0;
    const perPage = effectivePerPage || 20;
    return Math.max(1, Math.ceil(count / perPage));
  }, [effectivePerPage, pageSizeChoice, totalForPagination]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await listScans({ page, perPage: effectivePerPage });
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        const numericTotal = Number(data?.total);
        const totalCount = Number.isFinite(numericTotal) ? numericTotal : items.length;
        const serverPage = Number(data?.page);
        const perPageRequested =
          pageSizeChoice === 'all' ? items.length || totalCount || effectivePerPage : effectivePerPage;
        const ignoresPagination = pageSizeChoice !== 'all' && items.length > perPageRequested;

        if (ignoresPagination) {
          setServerPagination(false);
          setAllScans(items);
          setScans(items);
          setTotal(totalCount || items.length);
        } else {
          setServerPagination(true);
          setAllScans([]);
          setScans(items);
          setTotal(totalCount || items.length);
          if (Number.isFinite(serverPage) && serverPage !== page) {
            setPage(serverPage);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Erreur lors du chargement des scans:', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectivePerPage, page, pageSizeChoice, refreshToken]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const effectiveTotal = totalForPagination;

  const pageSizeOptions = useMemo(() => {
    const totalCount = effectiveTotal > 0 ? effectiveTotal : 0;
    const options = [{ value: '20', label: t('pagination.showCount', { count: 20 }) }];
    if (totalCount <= 20) {
      return options;
    }
    for (let step = 40; step <= totalCount; step += 20) {
      options.push({ value: String(step), label: t('pagination.showCount', { count: step }) });
    }
    options.push({ value: 'all', label: t('pagination.showAll') });
    return options;
  }, [t, effectiveTotal]);

  const onClearHistory = async () => {
    if (!isPro) return; // Only Pro can clear history
    if (!confirm(t('history.confirmClear'))) return;
    try {
      await clearScans();
      setPage(1);
      setPageSizeChoice('20');
      setRefreshToken((token) => token + 1);
      setAllScans([]);
      setServerPagination(true);
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

        {hasHistoryAccess && loading && scans.length === 0 && (
          <div className="table-wrap" style={{ display: 'flex', justifyContent: 'center' }}>
            <LoadingIndicator block size="lg" />
          </div>
        )}

        {/* Contenu normal pour les utilisateurs Pro ou si la fonctionnalité est accessible */}
        {hasHistoryAccess && !loading && scans.length === 0 && <p>{t('history.noScans')}</p>}

        {hasHistoryAccess && (serverPagination ? scans.length : allScans.length) > 0 && (
          <div className="table-wrap">
            {effectiveTotal > 0 && (
              <div
                className="table-controls"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 16,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label htmlFor="history-page-size">{t('pagination.rowsPerPage')}</label>
                  <select
                    id="history-page-size"
                    value={pageSizeChoice}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPageSizeChoice(value);
                      setPage(1);
                    }}
                  >
                    {pageSizeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span>{t('pagination.pageOf', { page, total: totalPages })}</span>
                  <div className="pager-buttons" style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn link"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page <= 1}
                    >
                      {t('pagination.previous')}
                    </button>
                    <button
                      type="button"
                      className="btn link"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={page >= totalPages}
                    >
                      {t('pagination.next')}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                {(serverPagination
                  ? scans
                  : allScans.slice(
                      pageSizeChoice === 'all' ? 0 : (page - 1) * effectivePerPage,
                      pageSizeChoice === 'all' ? undefined : (page - 1) * effectivePerPage + effectivePerPage,
                    )
                ).map((scan) => (
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
