import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cancelSubscription, resumeSubscription } from '../api/endpoints.js';
import { useSubscription } from '../hooks/useSubscription.js';

export default function CancelSubscriptionButton() {
  const { t } = useTranslation();
  const { subscription, refresh } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Vérifier si l'abonnement est en cours d'annulation
  const isCancelling = subscription?.isCancelling || false;

  const handleCancel = async () => {
    setLoading(true);
    try {
      await cancelSubscription();
      await refresh(); // Refresh subscription status
      setShowConfirm(false);
      alert(t('subscription.cancel.scheduledAlert'));
    } catch (error) {
      console.error('Cancel error:', error);
      alert(t('subscription.cancel.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      await resumeSubscription();
      await refresh(); // Refresh subscription status
      alert(t('subscription.resume.success'));
    } catch (error) {
      console.error('Resume error:', error);
      alert(t('subscription.resume.error'));
    } finally {
      setLoading(false);
    }
  };

  // Si l'abonnement est en cours d'annulation, afficher le bouton pour reprendre
  if (isCancelling) {
    return (
      <div style={{ marginTop: '16px' }}>
        <div style={{ 
          padding: '12px', 
          backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
          border: '1px solid var(--color-warning)',
          borderRadius: 'var(--radius, 8px)',
          marginBottom: '12px'
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: '14px',
            color: 'var(--color-text)'
          }}>
            {t('subscription.cancel.scheduledInfo')}
          </p>
        </div>
        <button 
          className="btn primary outline" 
          onClick={handleResume}
          disabled={loading}
        >
          {loading ? t('subscription.resume.processing') : t('subscription.resume.button')}
        </button>
      </div>
    );
  }

  // Bouton d'annulation normal
  if (!showConfirm) {
    return (
      <button 
        className="btn danger outline" 
        onClick={() => setShowConfirm(true)}
        style={{ marginTop: '16px' }}
      >
        {t('subscription.cancel.button')}
      </button>
    );
  }

  return (
    <div style={{ 
      marginTop: '16px', 
      padding: '16px', 
      border: '1px solid var(--color-danger)', 
      borderRadius: 'var(--radius, 8px)', 
      backgroundColor: 'color-mix(in srgb, var(--color-danger) 8%, transparent)' 
    }}>
      <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-danger)' }}>
        {t('subscription.cancel.confirmTitle')}
      </h4>
      <p style={{ 
        margin: '0 0 16px 0', 
        color: 'var(--color-text)', 
        fontSize: '14px',
        lineHeight: '1.4'
      }}>
        {t('subscription.cancel.confirmMessage')}
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          className="btn danger" 
          onClick={handleCancel}
          disabled={loading}
        >
          {loading ? t('subscription.cancel.processing') : t('subscription.cancel.confirmYes')}
        </button>
        <button 
          className="btn" 
          onClick={() => setShowConfirm(false)}
          disabled={loading}
        >
          {t('subscription.cancel.confirmNo')}
        </button>
      </div>
    </div>
  );
}
