import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import ScanForm from './components/ScanForm.jsx';
import StatsCards from './components/StatsCards.jsx';
import ResultsTable from './components/ResultsTable.jsx';
import History from './components/History.jsx';
import Settings from './components/Settings.jsx';
// Plans section removed; replaced by upgrade CTA button
import UnlockButton from './components/UnlockButton.jsx';
import UpgradeModal from './components/UpgradeModal.jsx';
import ReportPreview from './components/ReportPreview.jsx';
import { startScan as apiStartScan, getScan, getScanResults } from './api/endpoints.js';

export default function App() {
  const [links, setLinks] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [currentScanId, setCurrentScanId] = useState(null);
  const [route, setRoute] = useState('dashboard'); // dashboard | history | settings
  const [filters, setFilters] = useState({
    search: '',
    type: 'all', // all | internal | external
    status: 'all', // all | ok | broken
    sortBy: 'url',
    sortDir: 'asc', // asc | desc
  });

  // Theme management: system | light | dark
  const getSystemTheme = () => (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('wpls.theme');
    return saved || 'system';
  });

  useEffect(() => {
    localStorage.setItem('wpls.theme', theme);
  }, [theme]);

  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;

  const startScan = async () => {
    if (scanning) return;
    setScanning(true);
    setLinks([]);
    
    try {
      // Démarrer le scan via l'API
      const scanData = await apiStartScan({
        site: (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : undefined,
        includeMenus: true,
        includeWidgets: true
      });
      
      setCurrentScanId(scanData.id);
      
      // Polling pour récupérer les résultats
      const pollResults = async () => {
        try {
          const scanStatus = await getScan(scanData.id);
          
          // Récupérer les liens scannés
          const results = await getScanResults(scanData.id, { perPage: 1000 });
          setLinks(results.items || []);
          
          // Si le scan n'est pas terminé, continuer le polling
          if (scanStatus.status === 'running' || scanStatus.status === 'pending') {
            setTimeout(pollResults, 2000); // Vérifier toutes les 2 secondes
          } else {
            setScanning(false);
          }
        } catch (error) {
          console.error('Erreur lors du polling:', error);
          setScanning(false);
        }
      };
      
      // Démarrer le polling après 1 seconde
      setTimeout(pollResults, 1000);
      
    } catch (error) {
      console.error('Erreur lors du démarrage du scan:', error);
      setScanning(false);
    }
  };

  const onUpdateFilters = (partial) =>
    setFilters((prev) => ({ ...prev, ...partial }));

  const stats = useMemo(() => {
    const total = links.length;
    const internal = links.filter((l) => l.type === 'internal').length;
    const external = links.filter((l) => l.type === 'external').length;
    const broken = links.filter((l) => l.status === 'broken').length;
    const ok = links.filter((l) => l.status === 'ok').length;
    return { total, internal, external, broken, ok };
  }, [links]);

  const filtered = useMemo(() => {
    let data = [...links];
    if (filters.type !== 'all') data = data.filter((l) => l.type === filters.type);
    if (filters.status !== 'all') data = data.filter((l) => l.status === filters.status);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter(
        (l) => l.url.toLowerCase().includes(q) || l.source.toLowerCase().includes(q),
      );
    }
    data.sort((a, b) => {
      const { sortBy, sortDir } = filters;
      const mul = sortDir === 'asc' ? 1 : -1;
      const av = String(a[sortBy] ?? '');
      const bv = String(b[sortBy] ?? '');
      return av.localeCompare(bv) * mul;
    });
    return data;
  }, [links, filters]);

  const [showReport, setShowReport] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <div className={`wp-link-app theme-${effectiveTheme}`}>
      <Sidebar active={route} onNavigate={setRoute} />
      <main className="content">
        <Header
          onScan={startScan}
          scanning={scanning}
          showScan={route === 'dashboard'}
          theme={theme}
          onChangeTheme={setTheme}
        />

        {route === 'dashboard' && (
          <>
            <div className="section">
              <div className="unlock-cta">
                <UnlockButton onClick={() => setShowUpgrade(true)} />
              </div>
            </div>
            <div className="section">
              <StatsCards stats={stats} />
            </div>
            <div className="section">
              <ScanForm onScan={startScan} scanning={scanning} onChange={onUpdateFilters} />
            </div>
            <div className="section">
              <div className="actions" style={{ marginBottom: 12 }}>
                <button className="btn" onClick={() => setShowReport(true)}>Générer un PDF (aperçu)</button>
              </div>
              <ResultsTable
                items={filtered}
                total={links.length}
                filters={filters}
                onChangeFilters={onUpdateFilters}
              />
            </div>
          </>
        )}

        {route === 'history' && (
          <div className="section">
            <History />
          </div>
        )}

        {route === 'settings' && (
          <div className="section">
            <Settings theme={theme} onChangeTheme={setTheme} />
          </div>
        )}

        {/* Plans section removed */}

        {showUpgrade && (
          <UpgradeModal
            open={showUpgrade}
            onClose={() => setShowUpgrade(false)}
            // For now, only the button is implemented – no payment modal.
            onProceedPayment={() => { /* Hook up payment step later */ }}
          />
        )}

        {showReport && (
          <ReportPreview 
            stats={stats} 
            items={filtered} 
            scanId={currentScanId}
            onClose={() => setShowReport(false)} 
          />
        )}
      </main>
    </div>
  );
}
