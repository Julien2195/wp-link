import React from 'react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import '../../styles/Header.scss';

export default function Header({ onScan, scanning, showScan = true, theme, onChangeTheme }) {
  const { t } = useTranslation();

  return (
    <header className="header">
      <div className="left">
        <h2>{t('dashboard.scanForm.title')}</h2>
        <p className="subtitle">{t('dashboard.scanForm.description')}</p>
      </div>
      <div className="right">
        <LanguageSelector />
        <ThemeToggle theme={theme} onChange={onChangeTheme} />
        {showScan && (
          <button className="btn primary" onClick={onScan} disabled={scanning}>
            {scanning ? t('dashboard.scanForm.scanning') : t('dashboard.scanForm.startScan')}
          </button>
        )}
      </div>
    </header>
  );
}
