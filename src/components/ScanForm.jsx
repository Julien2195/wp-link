import React from 'react';
import '../../styles/ScanForm.scss';

export default function ScanForm({ onScan, scanning, onChange }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Scan global du site</h3>
        <p>Scanne tous les liens des articles, pages, menus et widgets.</p>
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
        </div>
      </div>
    </div>
  );
}

