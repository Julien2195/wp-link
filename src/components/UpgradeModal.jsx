import React from "react";
import { useTranslation } from 'react-i18next';
import "../../styles/FeatureComparisonModal.scss";

export default function UpgradeModal({ open, onClose, onProceedPayment }) {
  const backdropRef = React.useRef(null);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const features = [
    { name: t('payment.compare.features.linkScans'), free: t('subscription.urlLimit', { max: 10 }), pro: t('subscription.values.unlimited'), icon: '⚡' },
    { name: t('payment.compare.features.detailedReports'), free: false, pro: t('payment.compare.proReports'), icon: '📄' },
    { name: t('payment.compare.features.scanHistory'), free: false, pro: true, icon: '📄' },
    { name: t('payment.compare.features.scanScheduling'), free: false, pro: true, icon: '📅' },
    { name: t('payment.compare.features.emailDelivery'), free: false, pro: true, icon: '✉️' },
  ];

  return (
    <div
      ref={backdropRef}
      className="wp-link-modal-backdrop"
      aria-modal="true"
      role="dialog"
      aria-label={t('subscription.unlockFeatures')}
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose?.(); }}
    >
      <div className="modal">
        <button className="modal__close" onClick={onClose} aria-label={t('common.close')}>✕</button>
        <div className="modal__header">
          <h3 className="modal__title">{t('payment.title')}</h3>
          <p className="modal__subtitle">{t('payment.subtitle')}</p>
        </div>
        <div className="modal__body">
          <div className="plans">
            {/* Plan Gratuit */}
            <div className="plan plan--free">
              <div className="plan__header">
                <h3 className="plan__title">{t('payment.freeTitle')}</h3>
                <div className="plan__price">
                  <span className="plan__amount">{t('payment.freePrice')}</span>
                </div>
              </div>

              <div className="plan__features">
                {features.map((feature, index) => (
                  <div key={`free-${index}`} className="feature">
                    <div className="feature__icon">{feature.icon}</div>
                    <div className="feature__content">
                      <span className="feature__name">{feature.name}</span>
                      <div className="feature__status">
                        {typeof feature.free === "boolean" ? (
                          feature.free ? (
                            <div className="feature__included"><span className="icon-check">✓</span><span>{t('subscription.values.included')}</span></div>
                          ) : (
                            <div className="feature__excluded"><span className="icon-x">✕</span><span>{t('subscription.values.notIncluded')}</span></div>
                          )
                        ) : (
                          feature.free
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="plan__footer">
                <button className="btn-disabled" disabled>{t('payment.currentPlan')}</button>
              </div>
            </div>

            {/* Plan Pro */}
            <div className="plan plan--pro">
              <div className="plan__badge">{t('payment.recommended')}</div>
              <div className="plan__header">
                <h3 className="plan__title">{t('payment.proTitle')}</h3>
                <div className="plan__price">
                  <span className="plan__amount">{t('payment.proPrice')}</span>
                </div>
              </div>

              <div className="plan__features">
                {features.map((feature, index) => (
                  <div key={`pro-${index}`} className="feature">
                    <div className="feature__icon feature__icon--primary">{feature.icon}</div>
                    <div className="feature__content">
                      <span className="feature__name">{feature.name}</span>
                      <div className="feature__status">
                        {typeof feature.pro === "boolean" ? (
                          feature.pro ? (
                            <div className="feature__included"><span className="icon-check">✓</span><span>{t('subscription.values.included')}</span></div>
                          ) : (
                            <div className="feature__excluded"><span className="icon-x">✕</span><span>{t('subscription.values.notIncluded')}</span></div>
                          )
                        ) : (
                          feature.pro
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="plan__footer">
                <button className="btn-primary" onClick={() => onProceedPayment?.('pro')}>{t('payment.continueToPayment')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
