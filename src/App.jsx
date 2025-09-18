import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { useSubscription } from './hooks/useSubscription.js';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import ScanForm from './components/ScanForm.jsx';
import StatsCards from './components/StatsCards.jsx';
import ResultsTable from './components/ResultsTable.jsx';
import History from './components/History.jsx';
import Settings from './components/Settings.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';
import Scheduler from './components/Scheduler.jsx';
import UnlockButton from './components/UnlockButton.jsx';
const UpgradeModal = lazy(() => import('./components/UpgradeModal.jsx'));
const PaymentModal = lazy(() => import('./components/PaymentModal.jsx'));
import LoadingIndicator from './components/LoadingIndicator.jsx';
import {
  createEmbeddedCheckoutSession,
  createHostedCheckoutSession,
  getConnectionStatus,
  connectAccount,
  giveConsent,
  getUserProfile,
  refreshAuth,
  getSubscription,
  startScan as apiStartScan,
  getScan,
  getScanResults,
  sendVerification,
  confirmVerification,
} from './api/endpoints.js';
import { BASE_URL } from './api/client.js';
const ReportPreview = lazy(() => import('./components/ReportPreview.jsx'));
import { useTranslation } from 'react-i18next';
import LanguageSelector from './components/LanguageSelector.jsx';

const LOGIN_PENDING_KEY = 'wpls.loginPending';
const LOGIN_COMPLETED_KEY = 'wpls.loginCompleted';

export default function App() {
  const { t } = useTranslation();
  console.log('[LF] App render start');
  const { refresh: refreshSubscription, isPro, isFree, subscription } = useSubscription();
  console.log('[LF] useSubscription initial:', { isPro, isFree, subscription });

  const [links, setLinks] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [currentScanId, setCurrentScanId] = useState(null);
  const [route, setRoute] = useState('dashboard'); // dashboard | history | settings | scheduler | privacy
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
    console.log('[LF] Theme changed to', theme, 'effectiveTheme=', effectiveTheme);
  }, [theme]);

  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;

  // Connection gate: require explicit opt-in before enabling features
  const [checkingConn, setCheckingConn] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [verificationStep, setVerificationStep] = useState('form'); // form | sent
  const [verificationEmail, setVerificationEmail] = useState('');
  const [consentRequired, setConsentRequired] = useState(false);
  const [consentEmail, setConsentEmail] = useState('');
  const isWpPluginContext = typeof window !== 'undefined' && !!window.LINK_FIXER_SETTINGS;
  const [email, setEmail] = useState('');
  const [site, setSite] = useState('');
  const [includeMenus, setIncludeMenus] = useState(true);
  const [includeWidgets, setIncludeWidgets] = useState(true);
  const pollTimerRef = useRef(null);
  const verificationPollRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const isMountedRef = useRef(true);
  const autoConnectAttemptedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    console.log('[LF] App mounted');

    // Initialiser BroadcastChannel pour communication entre onglets
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        broadcastChannelRef.current = new BroadcastChannel('link-fixer-auth');
        broadcastChannelRef.current.addEventListener('message', (event) => {
          // Traiter les completions de login
          if (event.data.type === 'LOGIN_COMPLETED' && isMountedRef.current && !connected) {
            console.log('[LF] Received login completion via BroadcastChannel:', event.data);
            setConnected(true);
            setVerificationStep('form');

            // Arrêter le polling si actif
            if (verificationPollRef.current) {
              clearInterval(verificationPollRef.current);
              verificationPollRef.current = null;
            }

            // Nettoyer le localStorage
            localStorage.removeItem(LOGIN_COMPLETED_KEY);
            localStorage.removeItem(LOGIN_PENDING_KEY);

            // Rafraîchir l'abonnement
            refreshSubscription().catch(err =>
              console.warn('[LF] Error refreshing subscription after BroadcastChannel:', err)
            );

            // Mettre focus sur cet onglet si c'est depuis un nouvel onglet
            if (event.data.fromNewTab) {
              // Essayer plusieurs méthodes pour prendre le focus
              setTimeout(() => {
                try {
                  // Méthode 1: Focus direct
                  window.focus();

                  // Méthode 2: Si la page n'est pas visible, essayer de la rendre visible
                  if (document.hidden) {
                    // Créer un petit événement sonore/visuel pour attirer l'attention
                    document.title = '🎉 Connexion réussie - Link Fixer';

                    // Remettre le titre normal après 3 secondes
                    setTimeout(() => {
                      document.title = 'Link Fixer';
                    }, 3000);
                  }

                  console.log('[LF] Focused on original tab after new tab login');
                } catch (focusErr) {
                  console.warn('[LF] Could not focus window:', focusErr);
                }
              }, 500);
            }
          }
        });
      } catch (err) {
        console.warn('[LF] BroadcastChannel not available:', err);
      }
    }

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (verificationPollRef.current) {
        clearInterval(verificationPollRef.current);
        verificationPollRef.current = null;
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [connected, refreshSubscription]);

  const processWpConnectOutcome = useCallback(
    (result, source = 'manual-connect') => {
      if (!result) return;

      if (result.auto_connected || result.ok) {
        console.log(`[LF] ${source}: user connected (auto)`);
        setConnected(true);
        setConsentRequired(false);
        setConsentEmail('');
        setConnectError(null);
      } else if (result.requires_consent) {
        const email = result.email || '';
        console.log(`[LF] ${source}: consent required for`, email);
        setConsentRequired(true);
        setConsentEmail(email);
        setConnected(false);
      }

      if (result.auto_connected || result.ok) {
        setTimeout(() => {
          refreshSubscription()
            .then(() =>
              console.log(`[LF] refreshSubscription() completed after ${source}`),
            )
            .catch((err) =>
              console.warn(
                `[LF] refreshSubscription() after ${source} failed:`,
                err?.message || err,
              ),
            );
        }, 300);
      }
    },
    [refreshSubscription],
  );

  // Force consent screen if URL hash requests it (e.g., after account deletion)
  const [forceConsent, setForceConsent] = useState(
    () => typeof window !== 'undefined' && window.location?.hash === '#lf-consent',
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onHashChange = () => setForceConsent(window.location.hash === '#lf-consent');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!isWpPluginContext) return;
    if (checkingConn || connected || forceConsent) return;
    if (autoConnectAttemptedRef.current) return;

    autoConnectAttemptedRef.current = true;
    console.log('[LF] Auto-connect check triggered for WordPress context');

    (async () => {
      setConnecting(true);
      setConnectError(null);
      try {
        const result = await connectAccount();
        console.log('[LF] Auto connectAccount() result:', result);
        processWpConnectOutcome(result, 'auto-connect');
      } catch (err) {
        console.warn(
          '[LF] Auto connect attempt failed:',
          err?.response?.status || err?.message || err,
        );
        setConnectError(true);
      } finally {
        setConnecting(false);
      }
    })();
  }, [checkingConn, connected, forceConsent, isWpPluginContext, processWpConnectOutcome]);

  useEffect(() => {
    let mounted = true;
    console.log('[LF] Running getConnectionStatus effect');

    (async () => {
      try {
        // 1) On essaie d’abord le refresh silencieux (cookie lf_rt)
        const ref = await refreshAuth();
        console.log('[LF] refreshAuth() at boot:', ref);
        if (mounted) {
          setConnected(true);
          try {
            await refreshSubscription();
          } catch {}
        }
      } catch (e) {
        console.warn('[LF] refreshAuth() at boot failed, fallback to status:', e?.message || e);
        // 2) Fallback status
        try {
          const { connected } = await getConnectionStatus();
          if (mounted) setConnected(!!connected);
        } catch {
          if (mounted) setConnected(false);
        }
      } finally {
        if (mounted) setCheckingConn(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Polling pour détecter automatiquement la connexion après l'envoi du mail
  useEffect(() => {
    if (!isWpPluginContext && verificationStep === 'sent' && !connected) {
      console.log('[LF] Starting verification polling...');

      const pollForConnection = async () => {
        try {
          console.log('[LF] Polling for connection status...');
          const status = await getConnectionStatus();

          if (status.connected && isMountedRef.current) {
            console.log('[LF] Connection detected via polling! Updating state...');
            setConnected(true);
            setVerificationStep('form');

            if (verificationPollRef.current) {
              clearInterval(verificationPollRef.current);
              verificationPollRef.current = null;
            }

            try {
              localStorage.setItem(LOGIN_COMPLETED_KEY, JSON.stringify({
                completedAt: Date.now(),
                source: 'polling'
              }));
              localStorage.removeItem(LOGIN_PENDING_KEY);
              await refreshSubscription();
              console.log('[LF] Successfully refreshed subscription after polling detection');
            } catch (err) {
              console.warn('[LF] Error refreshing subscription after polling:', err);
            }
          }
        } catch (error) {
          console.warn('[LF] Verification polling error (non-fatal):', error?.message || error);
        }
      };

      // Démarrer le polling toutes les 3 secondes
      verificationPollRef.current = setInterval(pollForConnection, 3000);

      return () => {
        if (verificationPollRef.current) {
          clearInterval(verificationPollRef.current);
          verificationPollRef.current = null;
        }
      };
    }
  }, [verificationStep, connected, isWpPluginContext, refreshSubscription]);

  // Communication entre onglets via localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e) => {
      if (e.key === LOGIN_COMPLETED_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          console.log('[LF] Detected login completion from another tab:', data);

          if (isMountedRef.current && !connected) {
            setConnected(true);
            setVerificationStep('form');

            // Arrêter le polling si actif
            if (verificationPollRef.current) {
              clearInterval(verificationPollRef.current);
              verificationPollRef.current = null;
            }

            // Nettoyer le localStorage
            localStorage.removeItem(LOGIN_COMPLETED_KEY);
            localStorage.removeItem(LOGIN_PENDING_KEY);

            // Rafraîchir l'abonnement
            refreshSubscription().catch(err =>
              console.warn('[LF] Error refreshing subscription after cross-tab detection:', err)
            );

            // Mettre focus sur cet onglet si c'est depuis un nouvel onglet
            if (data.fromNewTab && typeof window !== 'undefined') {
              console.log('[LF] Bringing original tab to focus after new tab login');
              // Essayer plusieurs méthodes pour prendre le focus
              setTimeout(() => {
                try {
                  // Méthode 1: Focus direct
                  window.focus();

                  // Méthode 2: Si la page n'est pas visible, essayer de la rendre visible
                  if (document.hidden) {
                    // Créer un petit événement visuel pour attirer l'attention
                    document.title = '🎉 Connexion réussie - Link Fixer';

                    // Remettre le titre normal après 3 secondes
                    setTimeout(() => {
                      document.title = 'Link Fixer';
                    }, 3000);
                  }
                } catch (focusErr) {
                  console.warn('[LF] Could not focus window:', focusErr);
                }
              }, 500);
            }
          }
        } catch (err) {
          console.warn('[LF] Error parsing login completion data:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [connected, refreshSubscription]);

  // If URL contains verify_token, call confirmVerification to finalize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verify_token') || params.get('token');
    const verifiedFlag = params.get('verified');
    console.log('[LF] Verification effect run; params:', Object.fromEntries(params.entries()));

    // Détecter si on vient d'un lien email et s'il y a déjà un login en attente
    const isEmailClick = token || verifiedFlag === '1';
    const hasLoginPending = typeof window !== 'undefined' && localStorage.getItem(LOGIN_PENDING_KEY);

    if (isEmailClick && hasLoginPending) {
      console.log('[LF] Email click detected with pending login - managing tabs');

      // Approche simple : notifier les autres onglets et essayer de se fermer
      try {
        // Notifier immédiatement tous les autres onglets de se connecter
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'LOGIN_COMPLETED',
            completedAt: Date.now(),
            source: 'email-verification',
            fromNewTab: true
          });
          console.log('[LF] Notified other tabs via BroadcastChannel');
        }

        // Fallback localStorage
        localStorage.setItem(LOGIN_COMPLETED_KEY, JSON.stringify({
          completedAt: Date.now(),
          source: 'email-verification',
          fromNewTab: true
        }));

        console.log('[LF] Attempting to close this tab and focus original');

        // Essayer de fermer ce nouvel onglet et rediriger vers l'onglet principal
        setTimeout(() => {
          // D'abord essayer de fermer cet onglet
          try {
            window.close();
          } catch (closeErr) {
            console.warn('[LF] Cannot close tab, will show redirect page');
          }

          // Si on ne peut pas fermer, ou en parallèle, afficher une page de redirection
          // qui essaie de rediriger vers l'onglet principal
          document.body.innerHTML = `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: system-ui;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              margin: 0;
              padding: 0;
            ">
              <div style="
                text-align: center;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                padding: 40px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                max-width: 400px;
              ">
                <div style="font-size: 4rem; margin-bottom: 20px;">✅</div>
                <h2 style="margin: 0 0 15px 0; font-size: 1.8rem;">Connexion réussie !</h2>
                <p style="margin: 0 0 20px 0; opacity: 0.9;">
                  Redirection vers le SaaS en cours...
                </p>
                <div style="
                  width: 40px;
                  height: 40px;
                  border: 3px solid rgba(255,255,255,0.3);
                  border-radius: 50%;
                  border-top: 3px solid white;
                  animation: spin 1s linear infinite;
                  margin: 0 auto;
                "></div>
                <style>
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                </style>
              </div>
            </div>
          `;

          // Essayer de rediriger vers l'onglet principal après un court délai
          setTimeout(() => {
            try {
              // Essayer de trouver l'onglet principal et le focus
              if (window.opener && !window.opener.closed) {
                console.log('[LF] Focusing opener window');
                window.opener.focus();
                // Optionnel: fermer cet onglet après avoir focusé l'autre
                setTimeout(() => {
                  try {
                    window.close();
                  } catch (_) {}
                }, 1000);
              } else {
                // Si pas d'opener, essayer de naviguer vers l'URL de base du SaaS
                const baseUrl = window.location.origin;
                console.log('[LF] Redirecting to base URL:', baseUrl);
                window.location.href = baseUrl;
              }
            } catch (redirectErr) {
              console.warn('[LF] Could not redirect:', redirectErr);
              // Afficher un message pour fermer manuellement
              document.body.innerHTML = `
                <div style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  font-family: system-ui;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  margin: 0;
                  padding: 0;
                ">
                  <div style="
                    text-align: center;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    padding: 40px;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    max-width: 400px;
                  ">
                    <div style="font-size: 4rem; margin-bottom: 20px;">✅</div>
                    <h2 style="margin: 0 0 15px 0; font-size: 1.8rem;">Connexion réussie !</h2>
                    <p style="margin: 0 0 15px 0; opacity: 0.9;">
                      Retournez dans l'onglet principal pour accéder au SaaS.
                    </p>
                    <p style="margin: 0; font-size: 0.9rem; opacity: 0.7;">
                      Cet onglet peut être fermé.
                    </p>
                  </div>
                </div>
              `;
            }
          }, 1500);
        }, 100);

        // Empêcher le traitement normal de la connexion dans cet onglet
        return;

      } catch (err) {
        console.warn('[LF] Error in tab management:', err);
      }
    }

    // If backend redirected with ?verified=1 (cookies already set), perform a health check
    if (verifiedFlag === '1') {
      (async () => {
        console.log('[LF] Detected verified=1 in URL — running post-redirect health check');
        try {
          const [p, s, cs] = await Promise.allSettled([
            getUserProfile(),
            getSubscription(),
            getConnectionStatus(),
          ]);
          console.log('[LF] health getUserProfile:', p.status === 'fulfilled' ? p.value : p.reason);
          console.log(
            '[LF] health getSubscription:',
            s.status === 'fulfilled' ? s.value : s.reason,
          );
          console.log(
            '[LF] health getConnectionStatus:',
            cs.status === 'fulfilled' ? cs.value : cs.reason,
          );

          // If either profile or subscription indicates a session, mark connected
          const profileOk = p.status === 'fulfilled' && p.value && (p.value.user || p.value?.id);
          const subOk = s.status === 'fulfilled' && s.value;
          if (profileOk || subOk) {
            console.log(
              '[LF] Health check indicates active session — setting connected and refreshing',
            );
            setConnected(true);

            // Marquer la connexion comme terminée pour les autres onglets
            try {
              localStorage.setItem(LOGIN_COMPLETED_KEY, JSON.stringify({
                completedAt: Date.now(),
                source: 'verified-redirect'
              }));
              localStorage.removeItem(LOGIN_PENDING_KEY);
            } catch (storageErr) {
              console.warn('[LF] Unable to set login completion flag:', storageErr);
            }

            try {
              await refreshSubscription();
              console.log('[LF] refreshSubscription() completed from verified=1 health check');
            } catch (err) {
              console.warn('[LF] refreshSubscription() failed:', err);
            }
          } else {
            console.warn('[LF] Health check indicates no active session after redirect');
          }
        } catch (err) {
          console.warn('[LF] Error during verified=1 health check:', err);
        } finally {
          // clean URL param
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('verified');
            window.history.replaceState(null, '', url.pathname + url.search);
            console.log('[LF] Removed verified param from URL');
          } catch (_) {}
        }
      })();
    }

    if (token) {
      (async () => {
        try {
          const resp = await confirmVerification(token);
          console.log('[LF] confirmVerification() response:', resp);
          if (resp?.ok) {
            // If API key provided, try to set connected state
            if (resp.user?.api_key) {
              // Optionally store API key in localStorage for client usage
              try {
                localStorage.setItem('wpls.api_key', resp.user.api_key);
              } catch (_) {}
            }
            setConnected(true);

            // Marquer la connexion comme terminée pour les autres onglets
            try {
              localStorage.setItem(LOGIN_COMPLETED_KEY, JSON.stringify({
                completedAt: Date.now(),
                source: 'email-verification'
              }));
              localStorage.removeItem(LOGIN_PENDING_KEY);
            } catch (storageErr) {
              console.warn('[LF] Unable to set login completion flag:', storageErr);
            }

            try {
              await refreshSubscription();
              console.log('[LF] refreshSubscription() completed after token confirm');
            } catch (rsErr) {
              console.warn(
                '[LF] refreshSubscription() after token confirm failed:',
                rsErr?.message || rsErr,
              );
            }

            // Post-token-confirm health check
            try {
              const [p2, s2, cs2] = await Promise.allSettled([
                getUserProfile(),
                getSubscription(),
                getConnectionStatus(),
              ]);
              console.log(
                '[LF] post-token health getUserProfile:',
                p2.status === 'fulfilled' ? p2.value : p2.reason,
              );
              console.log(
                '[LF] post-token health getSubscription:',
                s2.status === 'fulfilled' ? s2.value : s2.reason,
              );
              console.log(
                '[LF] post-token health getConnectionStatus:',
                cs2.status === 'fulfilled' ? cs2.value : cs2.reason,
              );
            } catch (hcErr) {
              console.warn('[LF] post-token health check error:', hcErr);
            }
          }
          // Remove token from URL to clean UX
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('verify_token');
            url.searchParams.delete('token');
            window.history.replaceState(null, '', url.pathname + url.search);
          } catch (_) {}
        } catch (e) {
          console.warn('Email verification failed', e);
        }
      })();
    }
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
          console.warn(
            'Could not fetch user profile (non-fatal):',
            e?.response?.status || e?.message || e,
          );
        }
      } finally {
        console.groupEnd?.();
      }

      // Démarrer le scan via l'API
      const raw = site && site.trim() ? site.trim() : '';
      let siteToScan = raw;
      const isWeb = !isWpPluginContext;
      const looksUrl = (s) => /^https?:\/\/[^\s]+$/i.test(s);
      const looksHost = (s) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s);
      if (isWeb) {
        if (!siteToScan) {
          alert('Veuillez saisir un domaine (ex. https://mon-site.com)');
          setScanning(false);
          return;
        }
        if (!looksUrl(siteToScan)) {
          if (looksHost(siteToScan)) {
            siteToScan = 'https://' + siteToScan;
          } else {
            alert('URL invalide. Exemple attendu: https://mon-site.com');
            setScanning(false);
            return;
          }
        }
      } else {
        // Plugin WP: fallback sur l'origine si champ vide
        if (
          !siteToScan &&
          typeof window !== 'undefined' &&
          window.location &&
          window.location.origin
        ) {
          siteToScan = window.location.origin;
        }
      }
      const scanData = await apiStartScan({
        site: siteToScan,
        includeMenus: !!includeMenus,
        includeWidgets: !!includeWidgets,
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
          if (!isMountedRef.current) return;
          if (scanStatus.status === 'running' || scanStatus.status === 'pending') {
            console.log('Poll: Continuing polling in 2s...');
            pollTimerRef.current = setTimeout(pollResults, 2000);
          } else {
            // Scan terminé (completed, cancelled, ou autre statut)
            console.log('Poll: Scan finished with status:', scanStatus.status);
            setScanning(false);
          }
        } catch (error) {
          console.error('Erreur lors du polling:', error);
          if (isMountedRef.current) setScanning(false);
        }
      };

      // Démarrer le polling après 1 seconde
      pollTimerRef.current = setTimeout(pollResults, 1000);
    } catch (error) {
      console.error('Erreur lors du démarrage du scan:', error);
      if (isMountedRef.current) setScanning(false);
    }
  };

  const onUpdateFilters = (partial) => {
    if (!partial || typeof partial !== 'object') return;

    // Handle special fields that are not part of filters
    if (Object.prototype.hasOwnProperty.call(partial, 'site')) {
      setSite(partial.site);
    }
    if (Object.prototype.hasOwnProperty.call(partial, 'includeMenus')) {
      setIncludeMenus(!!partial.includeMenus);
    }
    if (Object.prototype.hasOwnProperty.call(partial, 'includeWidgets')) {
      setIncludeWidgets(!!partial.includeWidgets);
    }

    // Merge remaining keys into filters
    const { site: _s, includeMenus: _m, includeWidgets: _w, ...rest } = partial;
    if (Object.keys(rest).length > 0) {
      setFilters((prev) => ({ ...prev, ...rest }));
    }
  };

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
      data = data.filter((l) => {
        const urlMatch = (l.url || '').toLowerCase().includes(q);
        // Support grouped results: sources[]; and ungrouped: source
        const sourcesArr = Array.isArray(l.sources) ? l.sources : l.source ? [l.source] : [];
        const srcMatch = sourcesArr.some((s) => (s || '').toLowerCase().includes(q));
        return urlMatch || srcMatch;
      });
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
        <main className="content">
          <LoadingIndicator centered size="lg" />
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
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <h3 style={{ margin: 0 }}>{t('connection.title')}</h3>
                  <div style={{ marginLeft: 8 }}>
                    <LanguageSelector />
                  </div>
                </div>
                <p className="subtitle" style={{ margin: '12px 0 0 0', textAlign: 'center' }}>
                  {t('connection.description')}
                </p>
              </div>
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
              {connectError && (isWpPluginContext || verificationStep !== 'sent') && (
                <div style={{ color: 'var(--color-danger)', marginBottom: 12 }}>
                  {t('connection.error')}
                </div>
              )}
              {/* Web app context: ask for email explicitly */}
              {!isWpPluginContext && verificationStep === 'form' && (
                <div style={{ width: '100%', maxWidth: 520, textAlign: 'left' }}>
                  <label
                    htmlFor="lf-email"
                    style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}
                  >
                    Email
                  </label>
                  <input
                    id="lf-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      background: 'var(--color-bg)',
                    }}
                  />
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                    {t('connection.emailUsageHint')}
                  </div>
                </div>
              )}
              {!isWpPluginContext && verificationStep === 'sent' && (
                <div style={{ width: '100%', maxWidth: 520, textAlign: 'left' }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>{t('connection.checkInboxTitle')}</h4>
                  <p style={{ margin: '0 0 12px 0' }}>
                    {t('connection.checkInboxBody', { email: verificationEmail })}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>
                    {t('connection.checkInboxHint')}
                  </p>
                </div>
              )}
              {/* WordPress consent screen */}
              {isWpPluginContext && consentRequired && (
                <div style={{ width: '100%', maxWidth: 520, textAlign: 'left' }}>
                  <h4 style={{ margin: '0 0 12px 0' }}>{t('connection.consentTitle')}</h4>
                  <p style={{ margin: '0 0 12px 0' }}>
                    {t('connection.consentDescription', { email: consentEmail })}
                  </p>
                  <p style={{ margin: '0 0 12px 0', fontSize: 12, opacity: 0.8 }}>
                    {t('connection.consentHint')}
                  </p>
                  <button
                    className="btn primary"
                    disabled={connecting}
                    onClick={async () => {
                      setConnecting(true);
                      setConnectError(null);
                      try {
                        console.log('[LF] Giving consent for WordPress');
                        const result = await giveConsent();
                        console.log('[LF] Consent result:', result);
                        if (result.ok || result.auto_connected) {
                          setConnected(true);
                          setConsentRequired(false);
                          setTimeout(() => {
                            refreshSubscription();
                            console.log('[LF] Scheduled refreshSubscription() after consent');
                          }, 300);
                        }
                      } catch (err) {
                        console.warn('[LF] Consent failed:', err?.message || err);
                        setConnectError(true);
                      } finally {
                        setConnecting(false);
                      }
                    }}
                    style={{ marginRight: 12 }}
                  >
                    {connecting ? <LoadingIndicator size="sm" /> : t('connection.acceptConsent')}
                  </button>
                  <button
                    type="button"
                    className="btn link"
                    onClick={() => {
                      setConsentRequired(false);
                      setConsentEmail('');
                      setConnectError(null);
                    }}
                  >
                    {t('connection.cancelConsent')}
                  </button>
                </div>
              )}
              {/* Hide main button when WordPress consent is required */}
              {!(isWpPluginContext && consentRequired) && (
                <button
                  className="btn primary large"
                  disabled={
                    connecting ||
                    (!isWpPluginContext &&
                      verificationStep === 'form' &&
                      (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)))
                  }
                onClick={async () => {
                  console.log('[LF] Connect button clicked; isWpPluginContext=', isWpPluginContext);
                  setConnecting(true);
                  setConnectError(null);
                  try {
                    if (isWpPluginContext) {
                      // WordPress flow: call connectAccount to check if user exists or needs consent
                      console.log('[LF] Calling connectAccount() (plugin context)');
                      const result = await connectAccount();
                      console.log('[LF] connectAccount() result:', result);
                      processWpConnectOutcome(result, 'manual-connect');
                    } else {
                      const targetEmail =
                        verificationStep === 'sent' && verificationEmail
                          ? verificationEmail
                          : email;
                      console.log('[LF] Calling sendVerification() for email=', targetEmail);
                      await sendVerification(targetEmail);
                      console.log(
                        '[LF] sendVerification() completed; user must click the link in their mailbox',
                      );
                      if (typeof window !== 'undefined') {
                        try {
                          localStorage.setItem(
                            LOGIN_PENDING_KEY,
                            JSON.stringify({ email: targetEmail, requestedAt: Date.now() }),
                          );
                          localStorage.removeItem(LOGIN_COMPLETED_KEY);
                        } catch (storageErr) {
                          console.warn('[LF] Unable to persist login pending flag:', storageErr);
                        }
                      }
                      setVerificationEmail(targetEmail);
                      setVerificationStep('sent');
                      // Keep not connected until user clicks the link in their mailbox
                    }

                    // Clear forced-consent hash to reveal full app when appropriate
                    if (typeof window !== 'undefined' && window.location?.hash === '#lf-consent') {
                      try {
                        const { pathname, search } = window.location;
                        window.history?.replaceState(null, '', pathname + search);
                        setForceConsent(false);
                        console.log('[LF] Cleared #lf-consent hash');
                      } catch (_) {}
                    }
                  } catch (err) {
                    console.warn(
                      '[LF] Connect flow failed',
                      err?.response?.status || err?.message || err,
                    );
                    setConnectError(true);
                    if (!isWpPluginContext) {
                      const fallbackEmail =
                        verificationStep === 'sent' && verificationEmail
                          ? verificationEmail
                          : email;
                      setVerificationEmail(fallbackEmail);
                      setVerificationStep('sent');
                    }
                  } finally {
                    setConnecting(false);
                  }
                }}
              >
                {connecting
                  ? <LoadingIndicator size="sm" />
                  : isWpPluginContext
                    ? t('connection.connectButton')
                    : verificationStep === 'sent'
                      ? t('connection.resendVerificationButton')
                      : t('connection.sendVerificationButton') || t('connection.connectButton')}
              </button>
              )}
              {!isWpPluginContext && verificationStep === 'sent' && (
                <button
                  type="button"
                  className="btn link"
                  onClick={() => {
                    setVerificationStep('form');
                    setConnectError(null);
                  }}
                  style={{ marginTop: 8 }}
                >
                  {t('connection.useDifferentEmail')}
                </button>
              )}
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
                site={site}
                includeMenus={includeMenus}
                includeWidgets={includeWidgets}
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
            <Suspense
              fallback={
                <div className="panel">
                  <div className="panel-body panel-loading">
                    <LoadingIndicator block size="lg" />
                  </div>
                </div>
              }
            >
              <History onUpgrade={() => setShowUpgrade(true)} />
            </Suspense>
          </div>
        )}

        {route === 'scheduler' && (
          <div className="section">
            <Suspense
              fallback={
                <div className="panel">
                  <div className="panel-body panel-loading">
                    <LoadingIndicator block size="lg" />
                  </div>
                </div>
              }
            >
              <Scheduler
                onUpgrade={() => setShowUpgrade(true)}
                isDark={effectiveTheme === 'dark'}
              />
            </Suspense>
          </div>
        )}

        {route === 'settings' && (
          <div className="section">
            <Settings theme={theme} onChangeTheme={setTheme} />
          </div>
        )}

        {route === 'privacy' && (
          <div className="section">
            <PrivacyPolicy />
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
