import React, { useEffect, useMemo, useState } from 'react';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
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

function pad(n) { return String(n).padStart(2, '0'); }

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

function describeSchedule(s) {
  if (s.type === 'one_time') {
    const date = new Date(s.runAt);
    return `Une fois le ${date.toLocaleString()}`;
  }
  if (s.type === 'recurring') {
    return `Tous les ${s.everyDays} jours, à ${s.time} (${s.timezone})`;
  }
  return 'Planification';
}

function computeNextRun(s) {
  try {
    const now = new Date();
    if (!s.active) return null;
    
    if (s.type === 'one_time') {
      const d = new Date(s.runAt);
      return d > now ? d : null;
    }
    
    if (s.type === 'recurring') {
      const [hh, mm] = (s.time || '00:00').split(':').map((x) => parseInt(x, 10));
      
      // Utiliser lastRunAt comme anchor si disponible, sinon createdAt
      const anchor = s.lastRunAt ? new Date(s.lastRunAt) : new Date(s.createdAt);
      
      // Calculer le prochain run basé sur l'anchor + everyDays
      let candidate = new Date(anchor);
      candidate.setHours(hh, mm || 0, 0, 0);
      
      // Si le candidat est dans le passé, ajouter everyDays jusqu'à ce qu'il soit dans le futur
      const stepMs = (s.everyDays || 1) * 24 * 3600 * 1000;
      while (candidate <= now) {
        candidate = new Date(candidate.getTime() + stepMs);
      }
      
      return candidate;
    }
  } catch (_) {}
  return null;
}

export default function Scheduler() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem('wpls.schedules.enabled') !== 'false'; } catch (_) { return true; }
  });

  // Détection du thème
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('wpls.theme');
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
    // Pour 'system' ou non défini, utiliser la préférence système
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Surveiller les changements de thème
  useEffect(() => {
    const handleThemeChange = () => {
      const savedTheme = localStorage.getItem('wpls.theme');
      if (savedTheme === 'dark') setIsDarkMode(true);
      else if (savedTheme === 'light') setIsDarkMode(false);
      else setIsDarkMode(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    };

    // Écouter les changements de localStorage
    window.addEventListener('storage', handleThemeChange);
    
    // Écouter les changements de préférence système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

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
        setError('Impossible de charger les planifications');
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
    try { localStorage.setItem('wpls.schedules.enabled', enabled ? 'true' : 'false'); } catch (_) {}
  }, [enabled]);

  const activeSchedules = useMemo(() => {
    return items.filter(s => s.active || (s.type === 'recurring'));
  }, [items]);

  const historySchedules = useMemo(() => {
    return items.filter(s => s.type === 'one_time' && !s.active && s.lastRunAt);
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
      const site = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
      if (type === 'one_time') {
        if (!runAt) throw new Error('Veuillez choisir une date/heure');
        const payload = {
          type: 'one_time',
          runAt: dayjs.isDayjs(runAt) ? runAt.toDate().toISOString() : null,
          timezone,
          active: true,
          site,
        };
        const created = await createSchedule(payload);
        setItems((prev) => [...prev, created]);
        setRunAt(null);
      } else {
        if (!everyDays || everyDays < 1) throw new Error('Nombre de jours invalide');
        const payload = {
          type: 'recurring',
          everyDays: Number(everyDays),
          time,
          timezone,
          active: true,
          site,
        };
        const created = await createSchedule(payload);
        setItems((prev) => [...prev, created]);
      }
    } catch (e) {
      setError(e.message || 'Erreur lors de l’ajout');
    }
  };

  const onToggleActive = async (s) => {
    try {
      const updated = await updateSchedule(s.id, { active: !s.active });
      setItems((prev) => prev.map((it) => (it.id === s.id ? updated : it)));
    } catch (e) {
      setError('Impossible de mettre à jour');
    }
  };

  const onDelete = async (s) => {
    if (!confirm('Supprimer cette planification ?')) return;
    try {
      await deleteSchedule(s.id);
      setItems((prev) => prev.filter((it) => it.id !== s.id));
    } catch (e) {
      setError('Suppression impossible');
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Planification automatique</h3>
        <p>Programmez des scans planifiés (une fois ou récurrents).</p>
      </div>
      <div className="panel-body">
        {error && <div className="alert error">{error}</div>}
        
        {/* Toggle global */}
        <div className="scheduler-toggle">
          <label className="switch">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span>Activer la planification automatique</span>
          </label>
        </div>

        <hr />

        {/* Formulaire de création */}
        <div className="scheduler-form-section">
          <h4>Créer une nouvelle planification</h4>
          <form className="schedule-form" onSubmit={onAdd}>
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
                  <strong>Une seule fois</strong>
                  <small>Exécuter à une date et heure précise</small>
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
                  <strong>Récurrent</strong>
                  <small>Répéter selon un intervalle défini</small>
                </span>
              </label>
            </div>

            {/* Configuration selon le type */}
            <div className="form-config">
              {type === 'one_time' ? (
                <div className="form-row">
                  <label>Date et heure d'exécution</label>
                  <div className="datetime-input">
                    <ThemeProvider theme={createAppTheme(isDarkMode)}>
                      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                        <DateTimePicker
                          value={runAt}
                          onChange={(val) => setRunAt(val)}
                          minDateTime={dayjs()}
                          slotProps={{
                            textField: { 
                              fullWidth: true, 
                              size: 'small',
                              variant: 'outlined'
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </ThemeProvider>
                    <span className="input-hint">Fuseau horaire: {timezone}</span>
                  </div>
                </div>
              ) : (
                <div className="recurring-config">
                  <div className="form-row">
                    <label>Répéter tous les</label>
                    <div className="number-input">
                      <input 
                        type="number" 
                        min={1} 
                        max={365}
                        value={everyDays} 
                        onChange={(e) => setEveryDays(e.target.value)} 
                      />
                      <span>jours</span>
                    </div>
                  </div>
                  <div className="form-row">
                    <label>Heure d'exécution</label>
                    <div className="time-input">
                      <input 
                        type="time" 
                        value={time} 
                        onChange={(e) => setTime(e.target.value)} 
                      />
                      <span className="input-hint">Fuseau horaire: {timezone}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button className="btn primary" type="submit" disabled={!enabled}>
                <span>Créer la planification</span>
              </button>
            </div>
          </form>
        </div>

        {/* Planifications actives */}
        <div className="schedule-list">
          <h4 className="list-title">
            Planifications actives
            {activeSchedules.length > 0 && <span className="count">({activeSchedules.length})</span>}
          </h4>
          {loading ? (
            <div className="loading-state">Chargement…</div>
          ) : activeSchedules.length === 0 ? (
            <div className="empty-state">
              <p>Aucune planification active.</p>
              <small>Créez votre première planification ci-dessus.</small>
            </div>
          ) : (
            <div className="schedule-grid">
              {activeSchedules.map((s) => (
                <div key={s.id} className="schedule-item">
                  <div className="schedule-content">
                    <div className="schedule-title">{describeSchedule(s)}</div>
                    <div className="schedule-meta">
                      {s.active ? (
                        nextRuns[s.id] ? (
                          <span className="next-run">Prochaine exécution: {nextRuns[s.id].toLocaleString()}</span>
                        ) : (
                          <span className="status pending">En attente/échue</span>
                        )
                      ) : (
                        <span className="status inactive">Désactivée</span>
                      )}
                    </div>
                  </div>
                  <div className="schedule-actions">
                    <label className="switch small">
                      <input type="checkbox" checked={!!s.active} onChange={() => onToggleActive(s)} />
                      <span>Active</span>
                    </label>
                    <button className="btn danger outline small" onClick={() => onDelete(s)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique */}
        {historySchedules.length > 0 && (
          <div className="schedule-list history">
            <div className="list-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                Historique des exécutions <span className="count">({historySchedules.length})</span>
              </div>
              <button
                type="button"
                className="btn danger outline small"
                onClick={async () => {
                  if (!confirm("Vider l'historique des exécutions ?")) return;
                  try {
                    await clearScheduleHistory();
                    const res = await listSchedules();
                    setItems(res.items || []);
                  } catch (e) {
                    alert('Échec du nettoyage.');
                  }
                }}
              >
                Vider l'historique
              </button>
            </div>
            <div className="schedule-grid">
              {historySchedules.map((s) => (
                <div key={s.id} className="schedule-item history-item">
                  <div className="schedule-content">
                    <div className="schedule-title">{describeSchedule(s)}</div>
                    <div className="schedule-meta">
                      <span className="status completed">
                        ✓ Exécutée le {new Date(s.lastRunAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="schedule-actions">
                    <button className="btn danger outline small" onClick={() => onDelete(s)}>
                      Supprimer
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
