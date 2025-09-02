import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getSubscription } from '../api/endpoints.js';

const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchSubscription = async () => {
      try {
        setLoading(true);
        const data = await getSubscription();
        if (mounted) {
          setSubscription(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Erreur lors du chargement de l\'abonnement');
          setSubscription({ plan: 'free', scansThisMonth: 0, canCreateScan: false, isActive: false });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchSubscription();
    
    return () => {
      mounted = false;
    };
  }, []);

  const computedValues = useMemo(() => {
    const isPro = subscription ? (subscription.plan === 'pro' && subscription.isActive) : false;
    const isFree = !isPro;
    const canCreateScan = subscription?.canCreateScan ?? true;
    const scansThisMonth = subscription?.scansThisMonth ?? 0;
    const maxUrlsPerScan = subscription?.maxUrlsPerScan ?? 10;

    return {
      isPro,
      isFree,
      canCreateScan,
      scansThisMonth,
      maxUrlsPerScan
    };
  }, [subscription]);

  const canAccessFeature = useMemo(() => {
    return (feature) => {
      if (computedValues.isPro) return true;
      
      switch (feature) {
        case 'unlimited_urls':
          return false;
        case 'detailed_reports':
          return false;
        case 'scan_history':
          return false;
        case 'scheduling':
          return false;
        case 'email_notifications':
          return false;
        default:
          return false;
      }
    };
  }, [computedValues.isPro]);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await getSubscription();
      setSubscription(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Erreur lors du rafraîchissement');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    subscription,
    loading,
    error,
    ...computedValues,
    canAccessFeature,
    refresh
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
