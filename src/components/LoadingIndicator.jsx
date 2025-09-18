import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LoadingIndicator({ size = 'md', block = false, centered = false, className = '', label }) {
  const { t } = useTranslation();
  const accessibleLabel = label || t('common.loading');
  const classes = ['loading-indicator', `size-${size}`];
  if (block) classes.push('block');
  if (centered) classes.push('centered');
  if (className) classes.push(className);

  return (
    <span role="status" aria-live="polite" aria-label={accessibleLabel} className={classes.join(' ')}>
      <span className="loading-indicator__spinner" />
      <span className="visually-hidden">{accessibleLabel}</span>
    </span>
  );
}
