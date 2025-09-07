import React, { useState } from 'react';
import { cancelSubscription, resumeSubscription } from '../api/endpoints.js';
import { useSubscription } from '../hooks/useSubscription.js';

export default function CancelSubscriptionButton() {
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
      alert('Votre abonnement sera annulé à la fin de la période de facturation en cours.');
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      alert('Erreur lors de l\'annulation de l\'abonnement. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      await resumeSubscription();
      await refresh(); // Refresh subscription status
      alert('Votre abonnement a été repris avec succès.');
    } catch (error) {
      console.error('Erreur lors de la reprise:', error);
      alert('Erreur lors de la reprise de l\'abonnement. Veuillez réessayer.');
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
            ⚠️ Votre abonnement sera annulé à la fin de la période de facturation en cours.
          </p>
        </div>
        <button 
          className="btn primary outline" 
          onClick={handleResume}
          disabled={loading}
        >
          {loading ? 'Reprise...' : 'Reprendre mon abonnement'}
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
        Annuler mon abonnement
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
        Confirmer l'annulation
      </h4>
      <p style={{ 
        margin: '0 0 16px 0', 
        color: 'var(--color-text)', 
        fontSize: '14px',
        lineHeight: '1.4'
      }}>
        Êtes-vous sûr de vouloir annuler votre abonnement ? Vous conserverez l'accès aux fonctionnalités Pro jusqu'à la fin de votre période de facturation actuelle.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          className="btn danger" 
          onClick={handleCancel}
          disabled={loading}
        >
          {loading ? 'Annulation...' : 'Oui, annuler'}
        </button>
        <button 
          className="btn" 
          onClick={() => setShowConfirm(false)}
          disabled={loading}
        >
          Non, garder l'abonnement
        </button>
      </div>
    </div>
  );
}
