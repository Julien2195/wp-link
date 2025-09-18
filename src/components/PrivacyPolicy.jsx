import React from 'react';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  const externalUrl = 'https://linkfixer.io/politique-confidentialite';

  return (
    <div className="panel privacy-policy">
      <div className="panel-header">
        <h3>{t('privacy.title')}</h3>
      </div>
      <div className="panel-body">
        <p>
          {t(
            'privacy.redirectMessage',
            'La politique de confidentialité est disponible sur le site de LinkFixer.',
          )}{' '}
          <a href={externalUrl} target="_blank" rel="noopener noreferrer">
            {externalUrl}
          </a>
        </p>
      </div>
    </div>
  );
}
