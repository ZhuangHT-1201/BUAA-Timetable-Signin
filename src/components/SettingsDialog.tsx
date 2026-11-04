import {
  CalendarClock,
  Database,
  Github,
  Languages,
  LogOut,
  Power,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import type { Profile, ResolvedConnectionMode, Week } from '../types';
import { formatFullDate, parseLocalDate } from '../lib/date';
import { useI18n } from '../i18n';
import { LanguageToggle } from './LanguageToggle';

interface SettingsDialogProps {
  open: boolean;
  profile: Profile | null;
  mode: ResolvedConnectionMode;
  week: Week | undefined;
  cachedAt: string | null;
  offline: boolean;
  backgroundEnabled: boolean;
  backgroundAvailable: boolean;
  onBackgroundChange: (enabled: boolean) => void;
  onClose: () => void;
  onLogout: () => void;
  onClearData: () => void;
}

export function SettingsDialog({
  open,
  profile,
  mode,
  week,
  cachedAt,
  offline,
  backgroundEnabled,
  backgroundAvailable,
  onBackgroundChange,
  onClose,
  onLogout,
  onClearData,
}: SettingsDialogProps) {
  const { t, language, locale } = useI18n();
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-label={t('settings.title')}>
        <header>
          <div><span>{t('settings.title')}</span><h2>{t('settings.heading')}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label={t('settings.close')}><X size={20} /></button>
        </header>

        <div className="profile-card">
          <span className="profile-card__avatar">{(profile?.displayName ?? 'B').slice(0, 1)}</span>
          <div><strong>{profile?.displayName ?? t('settings.user')}</strong><p>{profile?.studentId ? t('common.studentId', { id: profile.studentId }) : t('settings.account')}</p></div>
          <span className="profile-card__mode">{offline ? t('common.offline') : mode === 'webvpn' ? t('common.webvpn') : t('common.direct')}</span>
        </div>

        <div className="settings-list">
          <div className="settings-row">
            <span><Smartphone size={18} /></span>
            <div><strong>{t('settings.connection')}</strong><small>{mode === 'webvpn' ? t('settings.webvpnSession') : t('settings.directSession')}</small></div>
            <em>{mode === 'webvpn' ? t('common.webvpn') : t('common.direct')}</em>
          </div>
          <div className="settings-row">
            <span><CalendarClock size={18} /></span>
            <div><strong>{t('settings.currentSchedule')}</strong><small>{week ? `${t('common.weekNumber', { number: week.number })} · ${formatFullDate(parseLocalDate(week.startDate), language)}` : t('settings.noSchedule')}</small></div>
          </div>
          <div className="settings-row settings-row--toggle">
            <span><Languages size={18} /></span>
            <div><strong>{t('settings.language')}</strong><small>{language === 'zh' ? t('settings.languageChinese') : t('settings.languageEnglish')}</small></div>
            <LanguageToggle />
          </div>
          <div className="settings-row settings-row--toggle">
            <span><Power size={18} /></span>
            <div><strong>{t('settings.background')}</strong><small>{!backgroundAvailable ? t('settings.backgroundDemo') : backgroundEnabled ? t('settings.backgroundOn') : t('settings.backgroundOff')}</small></div>
            <button
              type="button"
              role="switch"
              aria-label={t('settings.background')}
              aria-disabled={!backgroundAvailable}
              aria-checked={backgroundEnabled}
              className={`toggle-switch ${backgroundEnabled ? 'is-on' : ''}`}
              disabled={!backgroundAvailable}
              onClick={() => onBackgroundChange(!backgroundEnabled)}
            >
              <span />
            </button>
          </div>
          <div className="settings-row">
            <span><Database size={18} /></span>
            <div><strong>{t('settings.cache')}</strong><small>{cachedAt ? t('settings.updatedAt', { time: new Date(cachedAt).toLocaleString(locale) }) : t('settings.noCache')}</small></div>
          </div>
          <div className="settings-row">
            <span><Github size={18} /></span>
            <div><strong>{t('settings.license')}</strong><small>{t('settings.version', { version: '0.2.0' })}</small></div>
          </div>
        </div>

        <div className="settings-actions">
          <button className="danger-quiet-button" onClick={onClearData}><Trash2 size={16} /> {t('settings.clearCache')}</button>
          <button className="logout-button" onClick={onLogout}><LogOut size={17} /> {t('settings.logout')}</button>
        </div>
      </section>
    </div>
  );
}
