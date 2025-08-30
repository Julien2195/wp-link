import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '../styles/App.scss';

const container = document.getElementById('wp-link-scanner-root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

