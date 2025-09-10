import React from 'react';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  const updatedLabel = t('privacy.lastUpdatedLabel');
  const updatedDate = t('privacy.lastUpdatedDate');
  const rights = t('privacy.sections.rights.list', { returnObjects: true }) || [];
  const email = t('privacy.contactEmail');

  return (
    <div className="panel privacy-policy">
      <div className="panel-header">
        <h3>{t('privacy.title')}</h3>
        <p className="meta">{updatedLabel}: {updatedDate}</p>
      </div>
      <div className="panel-body">
        <section className="pp-section">
          <p>{t('privacy.intro')}</p>
        </section>

        <section className="pp-section" id="responsable">
          <h4>{t('privacy.sections.responsable.title')}</h4>
          <p>{t('privacy.sections.responsable.body')}</p>
        </section>

        <section className="pp-section" id="donnees">
          <h4>{t('privacy.sections.data.title')}</h4>
          <p>{t('privacy.sections.data.p1')}</p>
          <p>{t('privacy.sections.data.p2')}</p>
        </section>

        <section className="pp-section" id="finalites">
          <h4>{t('privacy.sections.purposes.title')}</h4>
          <p>{t('privacy.sections.purposes.body')}</p>
        </section>

        <section className="pp-section" id="conservation">
          <h4>{t('privacy.sections.retention.title')}</h4>
          <p>{t('privacy.sections.retention.body')}</p>
        </section>

        <section className="pp-section" id="partage">
          <h4>{t('privacy.sections.sharing.title')}</h4>
          <p>{t('privacy.sections.sharing.body')}</p>
        </section>

        <section className="pp-section" id="droits">
          <h4>{t('privacy.sections.rights.title')}</h4>
          <p>{t('privacy.sections.rights.intro')}</p>
          <ul>
            {Array.isArray(rights) && rights.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <p>{t('privacy.sections.rights.outro')}</p>
        </section>

        <section className="pp-section" id="contact">
          <h4>{t('privacy.sections.contact.title')}</h4>
          <div className="pp-contact">
            {t('privacy.sections.contact.body')}{' '}
            <a className="email" href={`mailto:${email}`}>{email}</a>
          </div>
        </section>
      </div>
    </div>
  );
}
