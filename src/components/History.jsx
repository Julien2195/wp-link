import React, { useState, useEffect } from 'react';
import ReportPreview from './ReportPreview.jsx';
import { listScans, getScanResults } from '../api/endpoints.js';

export default function History() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);

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

  const openPreview = async (scan) => {
    try {
      const results = await getScanResults(scan.id, { perPage: 1000 });
      setPreview({
        stats: {
          total: scan.total,
          ok: scan.ok,
          broken: scan.broken,
          redirect: scan.redirect,
          internal: 0, // Ces données ne sont pas disponibles dans la liste
          external: 0
        },
        items: results.items || [],
      });
    } catch (error) {
      console.error('Erreur lors du chargement des résultats:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h3>Historique des scans</h3>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Historique des scans</h3>
        <p>Liste des derniers scans réalisés.</p>
      </div>
      <div className="panel-body">
        {scans.length === 0 ? (
          <p>Aucun scan trouvé. Lancez votre premier scan depuis le dashboard.</p>
        ) : (
          <div className="table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Liens totaux</th>
                  <th>OK</th>
                  <th>Redirs</th>
                  <th>Cassés</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.id}>
                    <td>{formatDate(scan.startedAt || scan.createdAt)}</td>
                    <td>
                      <span className={`status-badge ${scan.status}`}>
                        {scan.status}
                      </span>
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
                        Voir rapport PDF
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
          onClose={() => setPreview(null)} 
        />
      )}
    </div>
  );
}
