import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/ResultsTable.scss';

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const statusText = t(`results.status.${status}`);
  return <span className={`badge ${status}`}>{statusText}</span>;
}

function TypeBadge({ type }) {
  const { t } = useTranslation();
  const typeText = t(`results.status.${type}`);
  return <span className={`badge type-${type}`}>{typeText}</span>;
}

export default function ResultsTable({ items, total, filters, onChangeFilters }) {
  const { t } = useTranslation();
  const set = (partial) => onChangeFilters(partial);

  const setSort = (key) => {
    const { sortBy, sortDir } = filters;
    if (sortBy === key) {
      set({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      set({ sortBy: key, sortDir: 'asc' });
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>{t('results.title')}</h3>
        <p>
          {items.length} {t('results.resultsShown')} {total}
        </p>
      </div>
      <div className="panel-body">
        <div className="filters">
          <input
            type="search"
            placeholder={t('results.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
          />
          <select value={filters.type} onChange={(e) => set({ type: e.target.value })}>
            <option value="all">{t('results.filters.all')}</option>
            <option value="internal">{t('results.filters.internal')}</option>
            <option value="external">{t('results.filters.external')}</option>
          </select>
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="all">{t('results.filters.all')}</option>
            <option value="ok">{t('results.filters.ok')}</option>
            <option value="broken">{t('results.filters.broken')}</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th onClick={() => setSort('url')}>
                  {t('results.table.url')}{' '}
                  {filters.sortBy === 'url' ? (filters.sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => setSort('type')}>
                  {t('results.table.type')}{' '}
                  {filters.sortBy === 'type' ? (filters.sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => setSort('status')}>
                  {t('results.table.status')}{' '}
                  {filters.sortBy === 'status' ? (filters.sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => setSort('source')}>
                  {t('results.table.foundOn')}{' '}
                  {filters.sortBy === 'source' ? (filters.sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((l, index) => (
                <tr key={l.id || `${l.url}-${index}`}>
                  <td className="url">
                    {l.url.startsWith('http') ? (
                      <a href={l.url} target="_blank" rel="noreferrer">
                        {l.url}
                      </a>
                    ) : (
                      <span>{l.url}</span>
                    )}
                  </td>
                  <td>
                    <TypeBadge type={l.type} />
                  </td>
                  <td>
                    <StatusBadge status={l.status} />
                  </td>
                  <td>
                    {l.sources ? (
                      <div className="sources-grouped">
                        <span className="source-count">
                          {l.sourceCount} {t('results.sources', { count: l.sourceCount })}
                        </span>
                        {l.sources.length > 0 && (
                          <div className="source-list">
                            {l.sources.slice(0, 3).map((source, idx) => (
                              <div key={idx} className="source-item">
                                {source}
                              </div>
                            ))}
                            {l.sources.length > 3 && (
                              <div className="source-more">
                                {t('results.moreOthers', { count: l.sources.length - 3 })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      l.source
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    {t('results.noResults')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
