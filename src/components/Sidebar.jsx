import React from 'react';
import '../../styles/Sidebar.scss';

export default function Sidebar({ active = 'dashboard', onNavigate }) {
  const nav = (key) => (e) => {
    e.preventDefault();
    onNavigate?.(key);
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="logo" aria-hidden>
          🔗
        </span>
        <span className="name">WP Link Scanner</span>
      </div>
      <nav className="menu">
        <a className={`item ${active === 'dashboard' ? 'active' : ''}`} href="#dashboard" onClick={nav('dashboard')}>
          Tableau de bord
        </a>
        <a className={`item ${active === 'history' ? 'active' : ''}`} href="#history" onClick={nav('history')}>
          Historique
        </a>
        <a className={`item ${active === 'plans' ? 'active' : ''}`} href="#plans" onClick={nav('plans')}>
          Offres
        </a>
        <a className={`item ${active === 'settings' ? 'active' : ''}`} href="#settings" onClick={nav('settings')}>
          Paramètres
        </a>
      </nav>
    </aside>
  );
}
