import React from 'react';
import { useLanguage } from '../contexts/LanguageContext.jsx';

const LanguageSelector = () => {
  const { currentLanguage, changeLanguage } = useLanguage();

  const languages = [
    {
      code: 'fr',
      name: 'Français',
      flag: '🇫🇷'
    },
    {
      code: 'en',
      name: 'English',
      flag: '🇺🇸'
    }
  ];

  const handleLanguageChange = (languageCode) => {
    changeLanguage(languageCode);
  };

  return (
    <div className="language-selector">
      <div className="language-dropdown">
        <button className="current-language">
          <span className="flag">
            {languages.find(lang => lang.code === currentLanguage)?.flag || '🇺🇸'}
          </span>
        </button>
        <div className="language-options">
          {languages
            .filter(language => language.code !== currentLanguage)
            .map((language) => (
              <button
                key={language.code}
                className="language-option"
                onClick={() => handleLanguageChange(language.code)}
              >
                <span className="flag">{language.flag}</span>
                <span className="name">{language.name}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;
