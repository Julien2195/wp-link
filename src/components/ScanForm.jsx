import React from 'react';
import { useSubscription } from '../hooks/useSubscription.js';
import PlanLimits from './PlanLimits.jsx';
import '../../styles/ScanForm.scss';

export default function ScanForm({ onScan, scanning, onChange, onUpgrade }) {
  const { isFree, maxUrlsPerScan } = useSubscription();

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Scan global du site</h3>
        <p>Scanne tous les liens des articles, pages, menus et widgets.</p>
        {isFree && <PlanLimits onUpgrade={onUpgrade} />}
      </div>
      <div className="panel-body form-grid">
        <div className="form-row">
          <label className="switch">
            <input type="checkbox" defaultChecked onChange={() => {}} />
            <span>Inclure les menus</span>
          </label>
          <label className="switch">
            <input type="checkbox" defaultChecked onChange={() => {}} />
            <span>Inclure les widgets</span>
          </label>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={onScan} disabled={scanning}>
            {scanning ? 'Scan en cours…' : 'Lancer le scan'}
          </button>
          {isFree && (
            <p className="scan-limit-message">
              Version gratuite : analyse limitée aux {maxUrlsPerScan} premières URLs trouvées.
              <button className="btn-link" onClick={onUpgrade}>
                Passez au plan Pro
              </button>
              pour analyser toutes les URLs de votre site.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

