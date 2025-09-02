import React, { useState, useEffect } from 'react';
import { useSubscription } from '../hooks/useSubscription.js';
import ReportPreview from './ReportPreview.jsx';
import { listScans, getScanResults, clearScans } from '../api/endpoints.js';

export default function History({ onUpgrade }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const { canAccessFeature, isFree, isPro, subscription } = useSubscription();

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
    if (
      !confirm(
        "Voulez-vous vraiment vider tout l'historique des scans ? Cette action est irréversible.",
      )
    )
      return;
    try {
      await clearScans();
      await loadScans();
    } catch (e) {
      console.error("Erreur lors du nettoyage de l'historique:", e);
      alert('Échec du nettoyage. Consultez les logs.');
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
      <div
        className="panel-header"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <div>
          <h3>Historique des scans</h3>
          <p>Liste des derniers scans réalisés.</p>
        </div>
        {scans.length > 0 && (
          <button className="btn danger" onClick={onClearHistory}>
            Vider l'historique
          </button>
        )}
      </div>
      <div className="panel-body">
        {/* Restriction pour les utilisateurs gratuits */}
        {isFree && !canAccessFeature('scan_history') && (
          <div className="feature-locked">
            <div className="lock-icon">🔒</div>
            <h4>Fonctionnalité Pro</h4>
            <p>L'historique des scans est disponible uniquement avec le plan Pro.</p>
            <button className="btn primary" onClick={onUpgrade}>
              Passer au plan Pro
            </button>
          </div>
        )}

        {/* Contenu normal pour les utilisateurs Pro ou si la fonctionnalité est accessible */}
        {(!isFree || canAccessFeature('scan_history')) && scans.length === 0 && (
          <p>Aucun scan trouvé. Lancez votre premier scan depuis le dashboard.</p>
        )}

        {(!isFree || canAccessFeature('scan_history')) && scans.length > 0 && (
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
          scanId={preview.scanId}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
