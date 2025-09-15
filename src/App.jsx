import React, { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { useSubscription } from './hooks/useSubscription.js';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import ScanForm from './components/ScanForm.jsx';
import StatsCards from './components/StatsCards.jsx';
import ResultsTable from './components/ResultsTable.jsx';
const History = lazy(() => import('./components/History.jsx'));
const Settings = lazy(() => import('./components/Settings.jsx'));
const Scheduler = lazy(() => import('./components/Scheduler.jsx'));
import UnlockButton from './components/UnlockButton.jsx';
const UpgradeModal = lazy(() => import('./components/UpgradeModal.jsx'));
const PaymentModal = lazy(() => import('./components/PaymentModal.jsx'));
import { createEmbeddedCheckoutSession, createHostedCheckoutSession, getConnectionStatus, connectAccount, getUserProfile } from './api/endpoints.js';
import { BASE_URL } from './api/client.js';
const ReportPreview = lazy(() => import('./components/ReportPreview.jsx'));
import { startScan as apiStartScan, getScan, getScanResults } from './api/endpoints.js';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './components/LanguageSelector.jsx';

export default function App() {
  const { t } = useTranslation();
  const { refresh: refreshSubscription, isPro, isFree, subscription } = useSubscription();
  const [links, setLinks] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [currentScanId, setCurrentScanId] = useState(null);
  const [route, setRoute] = useState('dashboard'); // dashboard | history | settings | scheduler
  const [filters, setFilters] = useState({
    search: '',
    type: 'all', // all | internal | external
    status: 'all', // all | ok | broken
    sortBy: 'url',
    sortDir: 'asc', // asc | desc
  });

  // Theme management: system | light | dark
  const getSystemTheme = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('wpls.theme');
    return saved || 'system';
  });

  useEffect(() => {
    localStorage.setItem('wpls.theme', theme);
  }, [theme]);

  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;

  // Connection gate: require explicit opt-in before enabling features
  const [checkingConn, setCheckingConn] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);

  // Force consent screen if URL hash requests it (e.g., after account deletion)
  const [forceConsent, setForceConsent] = useState(() =>
    (typeof window !== 'undefined' && window.location?.hash === '#lf-consent')
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onHashChange = () => setForceConsent(window.location.hash === '#lf-consent');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { connected } = await getConnectionStatus();
        if (mounted) setConnected(!!connected);
      } catch (_) {
        if (mounted) setConnected(false);
      } finally {
        if (mounted) setCheckingConn(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const startScan = async () => {
    if (scanning) return;
    setScanning(true);
    setLinks([]);

    try {
      // Debug: log user context just before starting scan
      try {
        console.groupCollapsed('[LinkFixer] StartScan: user context');
        console.log('Connected:', connected);
        console.log('Subscription:', subscription);
        console.log('API Base URL:', BASE_URL);
        if (typeof window !== 'undefined') {
          console.log('Location origin:', window.location?.origin);
          console.log('LINK_FIXER_SETTINGS present:', !!window.LINK_FIXER_SETTINGS);
          if (window.LINK_FIXER_SETTINGS) {
            const { locale, restUrl } = window.LINK_FIXER_SETTINGS;
            console.log('LINK_FIXER_SETTINGS:', { locale, restUrl });
          }
        }
        try {
          const profile = await getUserProfile();
          console.log('User profile:', profile?.user || profile);
        } catch (e) {
          console.warn('Could not fetch user profile (non-fatal):', e?.response?.status || e?.message || e);
        }
      } finally {
        console.groupEnd?.();
      }

      // Démarrer le scan via l'API
      const scanData = await apiStartScan({
        site:
          typeof window !== 'undefined' && window.location && window.location.origin
            ? window.location.origin
            : undefined,
        includeMenus: true,
        includeWidgets: true,
      });

      setCurrentScanId(scanData.id);

      // Polling pour récupérer les résultats
      const pollResults = async () => {
        try {
          const scanStatus = await getScan(scanData.id);
          console.log('Poll: Scan status:', scanStatus.status, 'for ID:', scanData.id);

          // Récupérer les liens scannés
          const results = await getScanResults(scanData.id, { perPage: 1000 });
          setLinks(results.items || []);
          console.log('Poll: Found', results.items?.length || 0, 'links');

          // Si le scan n'est pas terminé, continuer le polling
          if (scanStatus.status === 'running' || scanStatus.status === 'pending') {
            console.log('Poll: Continuing polling in 2s...');
            setTimeout(pollResults, 2000); // Vérifier toutes les 2 secondes
          } else {
            // Scan terminé (completed, cancelled, ou autre statut)
            console.log('Poll: Scan finished with status:', scanStatus.status);
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

  const onUpdateFilters = (partial) => setFilters((prev) => ({ ...prev, ...partial }));

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
  const [showPayment, setShowPayment] = useState(false);
  const [checkoutSecret, setCheckoutSecret] = useState(null);

  // Gate screen while not connected
  if (checkingConn && !forceConsent) {
    return (
      <div className={`wp-link-app theme-${effectiveTheme}`}>
        <main className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <div className="panel" style={{ width: 'min(900px, 96vw)' }}>
            <div className="panel-body">{t('common.loading')}</div>
          </div>
        </main>
      </div>
    );
  }

  if (forceConsent || !connected) {
    return (
      <div
        className={`wp-link-app theme-${effectiveTheme}`}
        style={{ display: 'flex', justifyContent: 'center' }}
      >
        <main
          className="content"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
          }}
        >
          <div className="panel" style={{ width: 'min(920px, 96vw)' }}>
            <div
              className="panel-header"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div>
                <h3 style={{ margin: 0, textAlign: 'center'}}>{t('connection.title')}</h3>
                <p className="subtitle" style={{ margin: '15px 0 0 0' }}>
                  {t('connection.description')}
                </p>
              </div>
              <LanguageSelector />
            </div>
            <div
              className="panel-body"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 12,
              }}
            >
              {connectError && (
                <div style={{ color: 'var(--color-danger)', marginBottom: 12 }}>
                  {t('connection.error')}
                </div>
              )}
              <button
                className="btn primary large"
                disabled={connecting}
                onClick={async () => {
                  setConnecting(true);
                  setConnectError(null);
                  try {
                    await connectAccount();
                    setConnected(true);
                    // refresh subscription and state shortly after connect
                    setTimeout(() => refreshSubscription(), 300);
                    // Clear forced-consent hash to reveal full app
                    if (typeof window !== 'undefined' && window.location?.hash === '#lf-consent') {
                      try {
                        const { pathname, search } = window.location;
                        window.history?.replaceState(null, '', pathname + search);
                        setForceConsent(false);
                      } catch (_) {}
                    }
                  } catch (e) {
                    setConnectError(true);
                  } finally {
                    setConnecting(false);
                  }
                }}
              >
                {connecting ? t('common.loading') : t('connection.connectButton')}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
            {/* Affichage du statut d'abonnement */}
            <div className="section">
              {/* Bouton upgrade seulement si version gratuite */}
              {isFree && (
                <div className="unlock-cta">
                  <UnlockButton onClick={() => setShowUpgrade(true)} />
                </div>
              )}
            </div>
            <div className="section">
              <StatsCards stats={stats} />
            </div>
            <div className="section">
              <ScanForm
                onScan={startScan}
                scanning={scanning}
                onChange={onUpdateFilters}
                onUpgrade={() => setShowUpgrade(true)}
              />
            </div>
            <div className="section">
              <div className="actions" style={{ marginBottom: 12 }}>
                <button className="btn" onClick={() => setShowReport(true)}>
                  Générer un PDF (aperçu)
                </button>
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
            <Suspense fallback={<div className="panel"><div className="panel-body">{t('common.loading')}</div></div>}>
              <History onUpgrade={() => setShowUpgrade(true)} />
            </Suspense>
          </div>
        )}

        {route === 'scheduler' && (
          <div className="section">
            <Suspense fallback={<div className="panel"><div className="panel-body">{t('common.loading')}</div></div>}>
              <Scheduler onUpgrade={() => setShowUpgrade(true)} isDark={effectiveTheme === 'dark'} />
            </Suspense>
          </div>
        )}

        {route === 'settings' && (
          <div className="section">
            <Suspense fallback={<div className="panel"><div className="panel-body">{t('common.loading')}</div></div>}>
              <Settings theme={theme} onChangeTheme={setTheme} />
            </Suspense>
          </div>
        )}

        {/* Plans section removed */}

        {showUpgrade && (
          <Suspense fallback={null}>
            <UpgradeModal
            open={showUpgrade}
            onClose={() => setShowUpgrade(false)}
            onProceedPayment={async (plan) => {
              const current =
                typeof window !== 'undefined' && window.location
                  ? window.location.href.split('#')[0]
                  : '';
              const sep = current.includes('?') ? '&' : '?';
              const returnUrl = current
                ? `${current}${sep}checkout_return=1&session_id={CHECKOUT_SESSION_ID}`
                : undefined;
              const successUrl = current
                ? `${current}${sep}checkout_success=1&session_id={CHECKOUT_SESSION_ID}`
                : undefined;
              const cancelUrl = current ? `${current}${sep}checkout_cancel=1` : undefined;
              // 1) Try Embedded Checkout (preferred)
              try {
                const { clientSecret } = await createEmbeddedCheckoutSession({
                  plan: plan || 'pro',
                  returnUrl,
                });
                if (clientSecret) {
                  setCheckoutSecret(clientSecret);
                  setShowUpgrade(false);
                  setShowPayment(true);
                  // Rafraîchir l'abonnement après le paiement
                  setTimeout(() => refreshSubscription(), 2000);
                  return;
                }
              } catch (e) {
                console.error('Embedded Checkout indisponible:', e?.message || e, e);
              }
              // 2) Fallback to Hosted Checkout created by backend
              try {
                const { url } = await createHostedCheckoutSession({
                  plan: plan || 'pro',
                  successUrl,
                  cancelUrl,
                });
                if (url) {
                  setShowUpgrade(false);
                  window.location.assign(url);
                  return;
                }
              } catch (err) {
                console.error('Hosted Checkout indisponible:', err?.message || err, err);
              }
              // 3) No client-only fallback. Report error.
              alert('Impossible de démarrer le paiement pour le moment.');
            }}
            />
          </Suspense>
        )}

        {showPayment && (
          <Suspense fallback={null}>
            <PaymentModal
            open={showPayment}
            onClose={() => {
              setShowPayment(false);
              setCheckoutSecret(null);
            }}
            checkoutClientSecret={checkoutSecret}
            />
          </Suspense>
        )}

        {showReport && (
          <Suspense fallback={null}>
            <ReportPreview
            stats={stats}
            items={filtered}
            scanId={currentScanId}
            onClose={() => setShowReport(false)}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}
