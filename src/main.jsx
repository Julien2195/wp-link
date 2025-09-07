import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { SubscriptionProvider } from './contexts/SubscriptionContext.jsx';
import { LanguageProvider } from './contexts/LanguageContext.jsx';
import './i18n'; // Initialisation d'i18next
import '../styles/App.scss';

const container = document.getElementById('wp-link-fixer-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <LanguageProvider>
      <SubscriptionProvider>
        <App />
      </SubscriptionProvider>
    </LanguageProvider>,
  );
}

