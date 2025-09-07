import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/StatsCards.scss';

const Stat = ({ label, value, tone = 'default' }) => (
  <div className={`stat ${tone}`}>
    <div className="value">{value}</div>
    <div className="label">{label}</div>
  </div>
);

export default function StatsCards({ stats }) {
  const { t } = useTranslation();

  const items = [
    { label: t('dashboard.stats.totalLinks'), value: stats.total, tone: 'accent' },
    { label: t('results.status.internal'), value: stats.internal },
    { label: t('results.status.external'), value: stats.external },
    { label: t('dashboard.stats.okLinks'), value: stats.ok, tone: 'success' },
    { label: t('dashboard.stats.brokenLinks'), value: stats.broken, tone: 'danger' },
  ];

  return (
    <div className="stats-grid">
      {items.map((s) => (
        <Stat key={s.label} {...s} />
      ))}
    </div>
  );
}

