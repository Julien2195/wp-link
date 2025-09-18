import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription.js';
import { getUserProfile } from '../api/endpoints.js';
import { useEffect, useState } from 'react';
import '../../styles/Sidebar.scss';

export default function Sidebar({ active = 'dashboard', onNavigate }) {
  const { t } = useTranslation();
  const { isPro, isFree, subscription } = useSubscription();
  const [email, setEmail] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const profile = await getUserProfile();
        if (mounted && profile && profile.user && profile.user.email) {
          setEmail(profile.user.email);
          console.log('eeee' + profile.user.email);
        }
      } catch (err) {
        console.log('Error getting profile:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
        <span className="name">LinkFixer SEO</span>
      </div>

      {/* Affichage du statut d'abonnement */}
      <div
        className="subscription-badge"
        style={{
          margin: '16px 12px',
          padding: '8px 12px',
          backgroundColor: isPro ? '#e8f5e8' : '#f0f4ff',
          borderRadius: 6,
          border: `1px solid ${isPro ? '#c3e6c3' : '#d1e2ff'}`,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: isPro ? '#2d5a2d' : '#1a365d' }}>
          {isPro ? `✓ ${t('subscription.proPlan')}` : t('subscription.freePlan')}
        </div>
        {subscription?.renewsAt && (
          <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
            {subscription.isCancelling
              ? t('subscription.expiresOn')
              : isPro
                ? t('settings.subscription.renewal')
                : t('subscription.expiresOn')}{' '}
            {new Date(subscription.renewsAt).toLocaleDateString(t('locale'))}
          </div>
        )}
      </div>

      <nav className="menu">
        {email && <div className="sidebar-email">{email}</div>}
        <a
          className={`item ${active === 'dashboard' ? 'active' : ''}`}
          href="#dashboard"
          onClick={nav('dashboard')}
        >
          {t('navigation.dashboard')}
        </a>
        <a
          className={`item ${active === 'history' ? 'active' : ''}`}
          href="#history"
          onClick={nav('history')}
        >
          {t('navigation.history')}
        </a>
        <a
          className={`item ${active === 'scheduler' ? 'active' : ''}`}
          href="#scheduler"
          onClick={nav('scheduler')}
        >
          {t('navigation.scheduler')}
        </a>
        <a
          className={`item ${active === 'settings' ? 'active' : ''}`}
          href="#settings"
          onClick={nav('settings')}
        >
          {t('navigation.settings')}
        </a>
        <a
          className={`item ${active === 'privacy' ? 'active' : ''}`}
          href="https://linkfixer.io/politique-confidentialite"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('navigation.privacy')}
        </a>
      </nav>
    </aside>
  );
}
