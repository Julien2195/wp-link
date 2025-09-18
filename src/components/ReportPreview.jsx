import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { downloadScanReport } from '../api/endpoints.js';
import linkify from '../utils/linkify.js';

export default function ReportPreview({ stats, items, onClose, scanId }) {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const time = new Date().toLocaleString(t('locale') || 'en-US');

  const handleDownload = async () => {
    if (!scanId || downloading) return;
    try {
      setDownloading(true);
      const response = await downloadScanReport(scanId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      // Récupère le nom du fichier depuis l'en-tête Content-Disposition
      let filename = `scan-${scanId}-report.pdf`;
      const disposition = response.headers['content-disposition'] || response.headers.get?.('content-disposition');
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF download error:', e);
      alert(t('errors.pdfDownload'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="wp-link-modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{t('report.title')}</h3>
          <button className="btn" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p>
            {t('report.dateLabel')}: {time}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="panel">
              <div className="panel-body">
                <strong>{t('history.totalLinks')}</strong>
                <div style={{ fontSize: 24 }}>{stats.total}</div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-body">
                <strong>{t('results.status.ok')}</strong>
                <div style={{ fontSize: 24, color: 'var(--color-success)' }}>{stats.ok}</div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-body">
                <strong>{t('results.status.broken')}</strong>
                <div style={{ fontSize: 24, color: 'var(--color-danger)' }}>{stats.broken}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <h4>{t('report.sampleTitle')}</h4>
            <div className="table-wrap">
              <table className="results-table report-preview-table">
                <thead>
                  <tr>
                    <th>{t('results.table.url')}</th>
                    <th>{t('results.table.type')}</th>
                    <th>{t('results.table.status')}</th>
                    <th>{t('results.table.foundOn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 10).map((l) => (
                    <tr key={l.id}>
                      <td className="url url-cell">
                        {l.url && l.url.startsWith('http') ? (
                          <a href={l.url} target="_blank" rel="noreferrer">
                            {l.url}
                          </a>
                        ) : (
                          <span>{l.url}</span>
                        )}
                      </td>
                      <td>{l.type}</td>
                      <td>{l.status}</td>
                      <td>
                        {l.sources ? (
                          <div>
                            <div style={{ marginBottom: 6 }}>
                              {t(
                                l.sourceCount === 1
                                  ? 'results.sources_one'
                                  : 'results.sources_other',
                                { count: l.sourceCount },
                              )}
                            </div>
                            <div style={{ fontSize: 13 }}>
                              {Array.isArray(l.sources) && l.sources.length > 0
                                ? l.sources.slice(0, 3).map((s, i) => (
                                    <div key={i}>
                                      {linkify(s).map((chunk, j) =>
                                        typeof chunk === 'object' && chunk.href ? (
                                          <a
                                            key={j}
                                            href={chunk.href}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            {chunk.href}
                                          </a>
                                        ) : (
                                          <span key={j}>{chunk}</span>
                                        ),
                                      )}
                                    </div>
                                  ))
                                : l.source || '-'}
                            </div>
                          </div>
                        ) : (
                          l.source || '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            {t('common.close')}
          </button>
          <button
            className="btn primary"
            onClick={handleDownload}
            disabled={!scanId || downloading}
            title={!scanId ? t('report.noScan') : undefined}
          >
            {downloading ? t('report.downloading') : t('report.downloadPdf')}
          </button>
        </div>
      </div>
    </div>
  );
}
