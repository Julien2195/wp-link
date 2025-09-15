import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../hooks/useSubscription.js';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/fr';
import 'dayjs/locale/en';

// Configurer dayjs avec les plugins nécessaires
dayjs.extend(utc);
dayjs.extend(timezone);
import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  clearScheduleHistory,
} from '../api/endpoints.js';
import '../../styles/Scheduler.scss';

const tzGuess = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (_) {
    return 'UTC';
  }
};

// Créer un thème Material-UI qui s'adapte au thème de l'application
const createAppTheme = (isDark = false) => {
  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: isDark ? '#5b8def' : '#2f6bff',
      },
      background: {
        default: isDark ? '#0b1220' : '#f7f8fb',
        paper: isDark ? '#111a2e' : '#ffffff',
      },
      text: {
        primary: isDark ? '#ffffff' : '#0b1220',
        secondary: isDark ? '#ffffff' : '#44546e',
      },
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-root': {
              borderRadius: '8px',
              backgroundColor: isDark ? '#111a2e' : '#ffffff',
              border: isDark ? '1px solid #1d2a44' : '1px solid #dfe3ea',
              '&:hover': {
                borderColor: isDark ? '#5b8def' : '#2f6bff',
              },
              '&.Mui-focused': {
                borderColor: isDark ? '#5b8def' : '#2f6bff',
              },
            },
            '& .MuiInputBase-input': {
              color: isDark ? '#ffffff' : '#0b1220',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: isDark ? '#ffffff' : '#44546e',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(91, 141, 239, 0.1)' : 'rgba(47, 107, 255, 0.1)',
            },
          },
        },
      },
    },
  });
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function toLocalDateTimeValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function fromLocalDateTimeValue(val) {
  if (!val) return null;
  const d = new Date(val);
  return d.toISOString();
}

function describeSchedule(s, t, locale) {
  if (s.type === 'one_time') {
    // L'API nous retourne maintenant la date dans le timezone utilisateur
    const date = new Date(s.runAt);

    // Simple formatage sans conversion de timezone car l'API fait déjà la conversion
    const formatted = date.toLocaleString(locale || 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return t('scheduler.scheduleDescriptions.oneTime', { date: formatted });
  }
  if (s.type === 'recurring') {
    return t('scheduler.scheduleDescriptions.recurring', {
      days: s.everyDays,
      time: s.time,
      timezone: s.timezone,
    });
  }
  return t('scheduler.scheduleDescriptions.default');
}

function computeNextRun(s) {
  try {
    const now = new Date();
    if (!s.active) return null;

    if (s.type === 'one_time') {
      // Pour one_time, utiliser runAt directement depuis la DB (déjà en UTC)
      const d = new Date(s.runAt);
      return d > now ? d : null;
    }

    if (s.type === 'recurring') {
      const [hh, mm] = (s.time || '00:00').split(':').map((x) => parseInt(x, 10));

      // Convertir l'heure courante vers le fuseau horaire de la tâche
      const userTimezone = s.timezone || 'Europe/Paris';
      const nowInUserTz = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));

      // Utiliser lastRunAt comme anchor si disponible, sinon createdAt
      const anchor = s.lastRunAt ? new Date(s.lastRunAt) : new Date(s.createdAt);
      const anchorInUserTz = new Date(anchor.toLocaleString('en-US', { timeZone: userTimezone }));

      // Calculer le prochain run basé sur l'anchor + everyDays dans le fuseau horaire utilisateur
      let candidate = new Date(anchorInUserTz);
      candidate.setHours(hh, mm || 0, 0, 0);

      // Si le candidat est dans le passé, ajouter everyDays jusqu'à ce qu'il soit dans le futur
      const stepMs = (s.everyDays || 1) * 24 * 3600 * 1000;
      while (candidate <= nowInUserTz) {
        candidate = new Date(candidate.getTime() + stepMs);
      }

      // Convertir le résultat vers UTC pour l'affichage
      return new Date(candidate.toLocaleString('en-US', { timeZone: 'UTC' }));
    }
  } catch (_) {}
  return null;
}

export default function Scheduler({ onUpgrade, isDark }) {
  const { t, i18n } = useTranslation();
  const { canAccessFeature, isFree, isPro, subscription } = useSubscription();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const locale = t('locale') || 'en-US';
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('wpls.schedules.enabled') !== 'false';
    } catch (_) {
      return true;
    }
  });

  // Bloquer l'accès à la planification pour les utilisateurs gratuits
  if (isFree && !canAccessFeature('scheduling')) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h3>{t('scheduler.title')}</h3>
        </div>
        <div className="panel-body">
          <div className="feature-locked">
            <div className="lock-icon">🔒</div>
            <h4>{t('subscription.proFeature')}</h4>
            <p>{t('scheduler.proDescription')}</p>
            <button className="btn primary" onClick={onUpgrade}>
              {t('subscription.upgradeToPro')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Email settings (pre-filled from WP admin email; editable)
  const defaultAdminEmail =
    typeof window !== 'undefined' && window.LINK_FIXER_SETTINGS && window.LINK_FIXER_SETTINGS.adminEmail
      ? window.LINK_FIXER_SETTINGS.adminEmail
      : '';

  const [emailEnabled, setEmailEnabled] = useState(() => {
    try {
      return localStorage.getItem('wpls.schedules.emailEnabled') !== 'false';
    } catch (_) {
      return true;
    }
  });
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('wpls.schedules.email') || defaultAdminEmail;
    } catch (_) {
      return defaultAdminEmail;
    }
  });

  // Détection du thème — contrôlée par prop si fournie, sinon fallback local
  const isDarkProp = typeof isDark === 'boolean' ? isDark : null;
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (isDarkProp !== null) return isDarkProp;
    const savedTheme = localStorage.getItem('wpls.theme');
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Suivre la prop en priorité (mise à jour instantanée depuis App)
  useEffect(() => {
    if (isDarkProp !== null) {
      setIsDarkMode(isDarkProp);
    }
  }, [isDarkProp]);

  // Fallback: surveiller préférences système uniquement si pas de prop
  useEffect(() => {
    if (isDarkProp !== null) return; // App pilote le thème

    const handleThemeChange = () => {
      const savedTheme = localStorage.getItem('wpls.theme');
      if (savedTheme === 'dark') setIsDarkMode(true);
      else if (savedTheme === 'light') setIsDarkMode(false);
      else setIsDarkMode(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, [isDarkProp]);

  const [type, setType] = useState('one_time'); // one_time | recurring
  const [runAt, setRunAt] = useState(null); // dayjs or null
  const [everyDays, setEveryDays] = useState(7);
  const [time, setTime] = useState('03:00');
  const [timezone, setTimezone] = useState(tzGuess());

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await listSchedules();
        setItems(res.items || []);
      } catch (e) {
        setError(t('scheduler.errorLoad'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Rafraîchissement automatique toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await listSchedules();
        setItems(res.items || []);
      } catch (e) {
        // Ignorer les erreurs de rafraîchissement silencieux
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('wpls.schedules.enabled', enabled ? 'true' : 'false');
    } catch (_) {}
  }, [enabled]);

  useEffect(() => {
    try {
      localStorage.setItem('wpls.schedules.emailEnabled', emailEnabled ? 'true' : 'false');
    } catch (_) {}
  }, [emailEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('wpls.schedules.email', email || '');
    } catch (_) {}
  }, [email]);

  // Prefill from WordPress admin email if empty on mount
  useEffect(() => {
    if (!email && defaultAdminEmail) {
      setEmail(defaultAdminEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSchedules = useMemo(() => {
    return items.filter((s) => s.active || s.type === 'recurring');
  }, [items]);

  const historySchedules = useMemo(() => {
    return items.filter((s) => s.type === 'one_time' && !s.active && s.lastRunAt);
  }, [items]);

  const nextRuns = useMemo(() => {
    const map = {};
    for (const s of activeSchedules) map[s.id] = computeNextRun(s);
    return map;
  }, [activeSchedules]);

  const onAdd = async (e) => {
    e?.preventDefault?.();
    setError(null);
    try {
      const site =
        typeof window !== 'undefined' && window.location && window.location.origin
          ? window.location.origin
          : '';
      if (type === 'one_time') {
        if (!runAt) throw new Error(t('scheduler.errorSelectDateTime'));

        // L'utilisateur veut que la tâche s'exécute à cette heure dans SON timezone
        // Pas en UTC ! On sauvegarde donc l'heure locale directement.
        const runAtDate = dayjs.isDayjs(runAt) ? runAt.toDate() : new Date(runAt);

        // Créer une chaîne ISO dans le timezone de l'utilisateur
        // Format: 2025-09-06T23:35:00 (sans Z, indique l'heure locale)
        const year = runAtDate.getFullYear();
        const month = String(runAtDate.getMonth() + 1).padStart(2, '0');
        const day = String(runAtDate.getDate()).padStart(2, '0');
        const hours = String(runAtDate.getHours()).padStart(2, '0');
        const minutes = String(runAtDate.getMinutes()).padStart(2, '0');

        const runAtLocalString = `${year}-${month}-${day}T${hours}:${minutes}:00`;

        const payload = {
          type: 'one_time',
          runAt: runAtLocalString, // Heure locale, pas UTC
          timezone,
          active: true,
          site,
          // Email preferences (server will ignore for now; kept for future)
          notify: !!emailEnabled,
          notifyEmail: email || defaultAdminEmail,
        };
        const created = await createSchedule(payload);
        setItems((prev) => [...prev, created]);
        setRunAt(null);
      } else {
        if (!everyDays || everyDays < 1) throw new Error(t('scheduler.errorInvalidDays'));
        const payload = {
          type: 'recurring',
          everyDays: Number(everyDays),
          time,
          timezone,
          active: true,
          site,
          notify: !!emailEnabled,
          notifyEmail: email || defaultAdminEmail,
        };
        const created = await createSchedule(payload);
        setItems((prev) => [...prev, created]);
      }
    } catch (e) {
      setError(e.message || t('scheduler.errorCreate'));
    }
  };

  const onToggleActive = async (s) => {
    try {
      const updated = await updateSchedule(s.id, { active: !s.active });
      setItems((prev) => prev.map((it) => (it.id === s.id ? updated : it)));
    } catch (e) {
      setError(t('scheduler.errorUpdate'));
    }
  };

  const onDelete = async (s) => {
    if (!confirm(t('scheduler.deleteConfirm'))) return;
    try {
      await deleteSchedule(s.id);
      setItems((prev) => prev.filter((it) => it.id !== s.id));
    } catch (e) {
      setError(t('scheduler.errorDelete'));
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>{t('scheduler.title')}</h3>
        <p>{t('scheduler.description')}</p>
      </div>
      <div className="panel-body">
        {error && <div className="alert error">{error}</div>}

        {/* Toggle global */}
        <div className="scheduler-toggle">
          <label className="switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>{t('scheduler.enabled')}</span>
          </label>
        </div>

        <hr />

        {/* Formulaire de création */}
        <div className="scheduler-form-section">
          <h4>{t('scheduler.createSchedule')}</h4>
          <form className="schedule-form" onSubmit={onAdd}>
            {/* Envoi e-mail optionnel */}
            <div className="form-row">
              <label>{t('scheduler.notifyByEmail')}</label>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                />
                <span>{t('scheduler.emailEnabled')}</span>
              </label>
            </div>

            {emailEnabled && (
              <div className="form-row">
                <label>{t('scheduler.emailAddress')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={defaultAdminEmail || 'email@example.com'}
                  required={emailEnabled}
                  style={{ maxWidth: 360 }}
                />
                <span className="input-hint">{t('scheduler.emailHint')}</span>
              </div>
            )}
            {/* Type de planification */}
            <div className="form-row radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="s-type"
                  checked={type === 'one_time'}
                  onChange={() => setType('one_time')}
                />
                <span className="radio-content">
                  <strong>{t('scheduler.oneTime')}</strong>
                  <small>{t('scheduler.oneTimeHint')}</small>
                </span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="s-type"
                  checked={type === 'recurring'}
                  onChange={() => setType('recurring')}
                />
                <span className="radio-content">
                  <strong>{t('scheduler.recurring')}</strong>
                  <small>{t('scheduler.recurringHint')}</small>
                </span>
              </label>
            </div>

            {/* Configuration selon le type */}
            <div className="form-config">
              {type === 'one_time' ? (
                <div className="form-row">
                  <label>{t('scheduler.selectDateTime')}</label>
                  <div className="datetime-input">
                    <ThemeProvider theme={createAppTheme(isDarkMode)}>
                      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language || 'en'}>
                        <DateTimePicker
                          key={`dtp-${isDarkMode ? 'dark' : 'light'}`}
                          value={runAt}
                          onChange={(val) => setRunAt(val)}
                          minDateTime={dayjs()}
                          timeSteps={{ minutes: 1 }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: 'small',
                              variant: 'outlined',
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </ThemeProvider>
                    <span className="input-hint">{t('scheduler.timezone')}: {timezone}</span>
                  </div>
                </div>
              ) : (
                <div className="recurring-config">
                  <div className="form-row">
                    <label>{t('scheduler.repeatEvery')}</label>
                    <div className="number-input">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={everyDays}
                        onChange={(e) => setEveryDays(e.target.value)}
                      />
                      <span>{t('scheduler.days')}</span>
                    </div>
                  </div>
                  <div className="form-row">
                    <label>{t('scheduler.executionTime')}</label>
                    <div className="time-input">
                      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                      <span className="input-hint">{t('scheduler.timezone')}: {timezone}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button className="btn primary" type="submit" disabled={!enabled}>
                <span>{t('scheduler.createSchedule')}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Planifications actives */}
        <div className="schedule-list">
          <h4 className="list-title">
            {t('scheduler.activeSchedules')}
            {activeSchedules.length > 0 && (
              <span className="count">({activeSchedules.length})</span>
            )}
          </h4>
          {loading ? (
            <div className="loading-state">{t('common.loading')}</div>
          ) : activeSchedules.length === 0 ? (
            <div className="empty-state">
              <p>{t('scheduler.noActiveSchedules')}</p>
              <small>{t('scheduler.createFirstSchedule')}</small>
            </div>
          ) : (
            <div className="schedule-grid">
              {activeSchedules.map((s) => (
                <div key={s.id} className="schedule-item">
                  <div className="schedule-content">
                    <div className="schedule-title">{describeSchedule(s, t, locale)}</div>
                    <div className="schedule-meta">
                      {s.active ? (
                        nextRuns[s.id] ? (
                          <span className="next-run">
                            {t('scheduler.nextExecution')}: {' '}
                            {nextRuns[s.id].toLocaleString(t('locale') || 'en-US', {
                              timeZone: s.timezone || 'Europe/Paris',
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="status pending">{t('scheduler.pending')}</span>
                        )
                      ) : (
                        <span className="status inactive">{t('scheduler.inactive')}</span>
                      )}
                    </div>
                  </div>
                  <div className="schedule-actions">
                    <label className="switch small">
                      <input
                        type="checkbox"
                        checked={!!s.active}
                        onChange={() => onToggleActive(s)}
                      />
                      <span>{t('scheduler.active')}</span>
                    </label>
                    <button className="btn danger outline small" onClick={() => onDelete(s)}>
                      {t('scheduler.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique (affiché pour tous les utilisateurs s'il existe) */}
        {historySchedules.length > 0 && (
          <div className="schedule-list history">
            <div
              className="list-title"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                {t('scheduler.scheduleHistory')} <span className="count">({historySchedules.length})</span>
              </div>
              <button
                type="button"
                className="btn danger outline small"
                onClick={async () => {
                  if (!confirm(t('scheduler.clearHistoryConfirm'))) return;
                  try {
                    await clearScheduleHistory();
                    const res = await listSchedules();
                    setItems(res.items || []);
                  } catch (e) {
                    alert(t('errors.clearHistory'));
                  }
                }}
              >
                {t('scheduler.clearHistory')}
              </button>
            </div>
            <div className="schedule-grid">
              {historySchedules.map((s) => (
                <div key={s.id} className="schedule-item history-item">
                  <div className="schedule-content">
                    <div className="schedule-title">{describeSchedule(s, t, locale)}</div>
                    <div className="schedule-meta">
                      <span className="status completed">
                        ✓ {t('scheduler.executedAt')}{' '}
                        {new Date(s.lastRunAt).toLocaleString(t('locale') || 'en-US', {
                          timeZone: s.timezone || 'Europe/Paris',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="schedule-actions">
                    <button className="btn danger outline small" onClick={() => onDelete(s)}>
                      {t('scheduler.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
