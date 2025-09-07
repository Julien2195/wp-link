import React, { useState } from 'react';
import { downloadScanReport } from '../api/endpoints.js';

export default function ReportPreview({ stats, items, onClose, scanId }) {
  const [downloading, setDownloading] = useState(false);
  const time = new Date().toLocaleString();

  const handleDownload = async () => {
    if (!scanId || downloading) return;
    try {
      setDownloading(true);
      const response = await downloadScanReport(scanId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scan-${scanId}-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erreur lors du téléchargement du PDF:', e);
      alert("Impossible de télécharger le PDF pour le moment.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="wp-link-modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Rapport d’analyse des liens</h3>
          <button className="btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p>Date du rapport: {time}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="panel">
              <div className="panel-body">
                <strong>Total</strong>
                <div style={{ fontSize: 24 }}>{stats.total}</div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-body">
                <strong>OK</strong>
                <div style={{ fontSize: 24, color: 'var(--color-success)' }}>{stats.ok}</div>
              </div>
            </div>
            <div className="panel">
              <div className="panel-body">
                <strong>Cassés</strong>
                <div style={{ fontSize: 24, color: 'var(--color-danger)' }}>{stats.broken}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <h4>Échantillon de liens</h4>
            <div className="table-wrap">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 10).map((l) => (
                    <tr key={l.id}>
                      <td>{l.url}</td>
                      <td>{l.type}</td>
                      <td>{l.status}</td>
                      <td>
                        {l.sources
                          ? `${l.sourceCount} source${l.sourceCount > 1 ? 's' : ''}`
                          : l.source || '-'}
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
            Fermer
          </button>
          <button
            className="btn primary"
            onClick={handleDownload}
            disabled={!scanId || downloading}
            title={!scanId ? 'Aucun scan en cours' : undefined}
          >
            {downloading ? 'Téléchargement…' : 'Télécharger PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
