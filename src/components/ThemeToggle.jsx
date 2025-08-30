import React from 'react';

function Icon({ name }) {
  // Icônes minimalistes en SVG inline pour un rendu propre
  if (name === 'system') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 20h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }
  if (name === 'light') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

export default function ThemeToggle({ theme, onChange }) {
  const next = () => {
    const order = ['system', 'light', 'dark'];
    const idx = order.indexOf(theme);
    onChange(order[(idx + 1) % order.length]);
  };

  const label = theme === 'system' ? 'Système' : theme === 'light' ? 'Clair' : 'Sombre';

  return (
    <button className="btn" onClick={next} title={`Thème: ${label}`} aria-label={`Thème: ${label}`}>
      <Icon name={theme} />
    </button>
  );
}
