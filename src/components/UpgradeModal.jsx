import React from "react";
import "../../styles/FeatureComparisonModal.scss";

export default function UpgradeModal({ open, onClose, onProceedPayment }) {
  const backdropRef = React.useRef(null);

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
    { name: "Scans de liens", free: "3 scans/mois", pro: "Illimités", icon: "⚡" },
    { name: "Rapports détaillés", free: false, pro: "Avancés + PDF", icon: "📄" },
    { name: "Programmation de scans", free: false, pro: true, icon: "📅" },
    { name: "Envoi par email", free: false, pro: true, icon: "✉️" },
  ];

  return (
    <div
      ref={backdropRef}
      className="wp-link-modal-backdrop"
      aria-modal="true"
      role="dialog"
      aria-label="Débloquer toutes les fonctionnalités"
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose?.(); }}
    >
      <div className="modal">
        <button className="modal__close" onClick={onClose} aria-label="Fermer">✕</button>
        <div className="modal__header">
          <h3 className="modal__title">Choisissez votre plan</h3>
          <p className="modal__subtitle">Débloquez tout le potentiel de votre scanner WordPress</p>
        </div>
        <div className="modal__body">
          <div className="plans">
            {/* Plan Gratuit */}
            <div className="plan plan--free">
              <div className="plan__header">
                <h3 className="plan__title">Gratuit</h3>
                <div className="plan__price">
                  <span className="plan__amount">0€</span>
                  <span className="plan__period">/mois</span>
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
                            <div className="feature__included"><span className="icon-check">✓</span><span>Inclus</span></div>
                          ) : (
                            <div className="feature__excluded"><span className="icon-x">✕</span><span>Non inclus</span></div>
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
                <button className="btn-disabled" disabled>Plan actuel</button>
              </div>
            </div>

            {/* Plan Pro */}
            <div className="plan plan--pro">
              <div className="plan__badge">Recommandé</div>
              <div className="plan__header">
                <h3 className="plan__title">Pro</h3>
                <div className="plan__price">
                  <span className="plan__amount">5€</span>
                  <span className="plan__period">/mois</span>
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
                            <div className="feature__included"><span className="icon-check">✓</span><span>Inclus</span></div>
                          ) : (
                            <div className="feature__excluded"><span className="icon-x">✕</span><span>Non inclus</span></div>
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
                <button className="btn-primary" onClick={() => onProceedPayment?.('pro')}>Continuer vers le paiement</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
