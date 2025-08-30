import React, { useState } from 'react';
import UnlockButton from './UnlockButton.jsx';
import UpgradeModal from './UpgradeModal.jsx';

export default function Settings({ theme, onChangeTheme }) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Paramètres</h3>
        <p>Personnalisez l’apparence et les préférences.</p>
      </div>
      <div className="panel-body">
        <div className="unlock-cta" style={{ marginBottom: 16 }}>
          <UnlockButton onClick={() => setShowUpgrade(true)} />
        </div>
        <div className="form-grid">
          <div>
            <label>Thème</label>
            <div className="form-row">
              <label className="switch">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === 'system'}
                  onChange={() => onChangeTheme('system')}
                />
                <span>Système</span>
              </label>
              <label className="switch">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === 'light'}
                  onChange={() => onChangeTheme('light')}
                />
                <span>Clair</span>
              </label>
              <label className="switch">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === 'dark'}
                  onChange={() => onChangeTheme('dark')}
                />
                <span>Sombre</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      {showUpgrade && (
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          onProceedPayment={() => { /* Hook up payment step later */ }}
        />
      )}
    </div>
  );
}
