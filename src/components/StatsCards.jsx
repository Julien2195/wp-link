import React from 'react';
import '../../styles/StatsCards.scss';

const Stat = ({ label, value, tone = 'default' }) => (
  <div className={`stat ${tone}`}>
    <div className="value">{value}</div>
    <div className="label">{label}</div>
  </div>
);

export default function StatsCards({ stats }) {
  const items = [
    { label: 'Liens totaux', value: stats.total, tone: 'accent' },
    { label: 'Internes', value: stats.internal },
    { label: 'Externes', value: stats.external },
    { label: 'OK', value: stats.ok, tone: 'success' },
    { label: 'Cassés', value: stats.broken, tone: 'danger' },
  ];

  return (
    <div className="stats-grid">
      {items.map((s) => (
        <Stat key={s.label} {...s} />
      ))}
    </div>
  );
}

