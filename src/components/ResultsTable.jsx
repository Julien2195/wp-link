import React from 'react';
import '../../styles/ResultsTable.scss';

function StatusBadge({ status }) {
  return <span className={`badge ${status}`}>{status}</span>;
}

function TypeBadge({ type }) {
  return <span className={`badge type-${type}`}>{type}</span>;
}

export default function ResultsTable({ items, total, filters, onChangeFilters }) {
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
        <h3>Résultats</h3>
        <p>
          {items.length} résultats affichés sur {total}
        </p>
      </div>
      <div className="panel-body">
        <div className="filters">
          <input
            type="search"
            placeholder="Rechercher une URL ou source…"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
          />
          <select value={filters.type} onChange={(e) => set({ type: e.target.value })}>
            <option value="all">Tous les types</option>
            <option value="internal">Interne</option>
            <option value="external">Externe</option>
          </select>
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="all">Tous les statuts</option>
            <option value="ok">OK</option>
            <option value="broken">Cassé</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th onClick={() => setSort('url')}>
                  URL {filters.sortBy === 'url' ? (filters.sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => setSort('type')}>
                  Type {filters.sortBy === 'type' ? (filters.sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => setSort('status')}>
                  Statut{' '}
                  {filters.sortBy === 'status' ? (filters.sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => setSort('source')}>
                  Sources{' '}
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
                      // Format groupé : affiche le nombre de sources et les premières
                      <div className="sources-grouped">
                        <span className="source-count">{l.sourceCount} source{l.sourceCount > 1 ? 's' : ''}</span>
                        {l.sources.length > 0 && (
                          <div className="source-list">
                            {l.sources.slice(0, 3).map((source, idx) => (
                              <div key={idx} className="source-item">{source}</div>
                            ))}
                            {l.sources.length > 3 && (
                              <div className="source-more">+ {l.sources.length - 3} autres</div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Format legacy : une seule source
                      l.source
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    Aucun résultat.
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
