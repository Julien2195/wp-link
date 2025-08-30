import React from 'react';

export default function Settings({ theme, onChangeTheme }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Paramètres</h3>
        <p>Personnalisez l’apparence et les préférences.</p>
      </div>
      <div className="panel-body">
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
    </div>
  );
}

