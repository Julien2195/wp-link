import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import des fichiers de traduction
import en from './locales/en.json';
import fr from './locales/fr.json';

// Détection de la langue WordPress
const getWordPressLanguage = () => {
  // Vérifier d'abord le localStorage pour une préférence utilisateur
  const savedLanguage = localStorage.getItem('wpls.language');
  if (savedLanguage && ['en', 'fr'].includes(savedLanguage)) {
    return savedLanguage;
  }

  // Sinon, récupération de la langue depuis les paramètres WordPress
  const wpLanguage = window.LINK_FIXER_SETTINGS?.locale || 'en_US';

  // Conversion du format WordPress (en_US, fr_FR) vers le format i18next (en, fr)
  const detected = wpLanguage && String(wpLanguage).toLowerCase().startsWith('fr') ? 'fr' : 'en';

  // Persister ce choix initial afin de garder la cohérence entre les sessions
  try {
    localStorage.setItem('wpls.language', detected);
  } catch (_) {
    // ignore
  }

  return detected; // Par défaut anglais pour toutes les autres langues
};

const resources = {
  en: {
    translation: en
  },
  fr: {
    translation: fr
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
      escapeValue: false, // React échappe déjà les valeurs
    }
  });

export default i18n;
