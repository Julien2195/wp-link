import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';

const SUPPORTED_LANGUAGES = ['en', 'fr', 'es'];

const getWordPressLanguage = () => {
  const savedLanguage = localStorage.getItem('wpls.language');
  if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
    return savedLanguage;
  }

  const wpLanguage = window.LINK_FIXER_SETTINGS?.locale || 'en_US';
  const normalized = typeof wpLanguage === 'string' ? wpLanguage.toLowerCase() : 'en_us';
  const prefix = normalized.split(/[-_]/)[0];
  const detected = SUPPORTED_LANGUAGES.includes(prefix) ? prefix : 'en';

  try {
    localStorage.setItem('wpls.language', detected);
  } catch (_) {
    // ignore
  }

  return detected;
};

const resources = {
  en: {
    translation: en
  },
  fr: {
    translation: fr
  },
  es: {
    translation: es
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getWordPressLanguage(),
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false,
    }
  });

export default i18n;
