import React from 'react';
import ThemeToggle from './ThemeToggle.jsx';
import '../../styles/Header.scss';

export default function Header({ onScan, scanning, showScan = true, theme, onChangeTheme }) {
  return (
    <header className="header">
      <div className="left">
        <h2>Scanner de liens</h2>
        <p className="subtitle">Analyse des liens internes et externes</p>
      </div>
      <div className="right">
        <ThemeToggle theme={theme} onChange={onChangeTheme} />
        {showScan && (
          <button className="btn primary" onClick={onScan} disabled={scanning}>
            {scanning ? 'Scan en cours…' : 'Lancer un scan'}
          </button>
        )}
      </div>
    </header>
  );
}
