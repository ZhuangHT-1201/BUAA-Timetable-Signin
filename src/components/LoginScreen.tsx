import {
  ArrowRight,
  CalendarCheck2,
  ChevronDown,
  Globe2,
  LoaderCircle,
  MapPinCheck,
  MonitorSmartphone,
  Sparkles,
  Wifi,
} from 'lucide-react';
import type { ConnectionMode, Profile } from '../types';
import { useI18n } from '../i18n';
import { LanguageToggle } from './LanguageToggle';
import { Logo } from './Logo';

interface LoginScreenProps {
  modePreference: ConnectionMode;
  onModeChange: (mode: ConnectionMode) => void;
  onConnect: () => void;
  onDemo: () => void;
  onOffline: () => void;
  canOpenOffline: boolean;
  offlineProfile: Profile | null;
  busy: boolean;
  error: string;
  platform: string;
}

export function LoginScreen({
  modePreference,
  onModeChange,
  onConnect,
  onDemo,
  onOffline,
  canOpenOffline,
  offlineProfile,
  busy,
  error,
  platform,
}: LoginScreenProps) {
  const { t } = useI18n();
  const modes: Array<{ value: ConnectionMode; title: string; note: string }> = [
    { value: 'auto', title: t('login.mode.auto'), note: t('login.mode.autoNote') },
    { value: 'direct', title: t('login.mode.direct'), note: t('login.mode.directNote') },
    { value: 'webvpn', title: t('login.mode.webvpn'), note: t('login.mode.webvpnNote') },
  ];
  const selected = modes.find((item) => item.value === modePreference) ?? modes[0];
  const ModeIcon = modePreference === 'direct' ? Wifi : modePreference === 'webvpn' ? Globe2 : Sparkles;

  return (
    <main className="login-shell">
      <div className="login-shell__grid" />
      <div className="login-shell__orb login-shell__orb--one" />
      <div className="login-shell__orb login-shell__orb--two" />

      <section className="login-story">
        <header className="login-story__top">
          <Logo inverse />
          <LanguageToggle />
          <span className="platform-pill">{platform}</span>
        </header>

        <div className="login-story__content">
          <div className="eyebrow eyebrow--light">
            <span />
            {t('login.eyebrow')}
          </div>
          <h1>{t('login.title')}</h1>
          <p className="login-story__intro">{t('login.intro')}</p>

          <div className="feature-rail">
            <article>
              <span className="feature-rail__icon"><CalendarCheck2 size={21} /></span>
              <div><strong>{t('login.feature.timetable')}</strong><p>{t('login.feature.timetableDetail')}</p></div>
            </article>
            <article>
              <span className="feature-rail__icon"><MapPinCheck size={21} /></span>
              <div><strong>{t('login.feature.signin')}</strong><p>{t('login.feature.signinDetail')}</p></div>
            </article>
            <article>
              <span className="feature-rail__icon"><MonitorSmartphone size={21} /></span>
              <div><strong>{t('login.feature.apps')}</strong><p>{t('login.feature.appsDetail')}</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="login-panel-wrap">
        <div className="login-panel">
          <div className="login-panel__heading">
            <h2>{t('login.heading')}</h2>
            <p>{t('login.subheading')}</p>
          </div>

          <div className="login-field">
            <label>{t('login.connection')}</label>
            <div className="mode-select">
              <span className="mode-select__icon"><ModeIcon size={19} /></span>
              <div>
                <strong>{selected.title}</strong>
                <small>{selected.note}</small>
              </div>
              <ChevronDown size={18} className="mode-select__chevron" />
              <select
                value={modePreference}
                onChange={(event) => onModeChange(event.target.value as ConnectionMode)}
                aria-label={t('login.connection')}
              >
                {modes.map((mode) => <option key={mode.value} value={mode.value}>{mode.title}</option>)}
              </select>
            </div>
          </div>

          {error && <div className="inline-error">{error}</div>}

          <button className="primary-button primary-button--wide" onClick={onConnect} disabled={busy}>
            {busy ? <LoaderCircle size={19} className="spin" /> : null}
            {busy ? t('login.opening') : t('login.action')}
            {!busy && <ArrowRight size={18} className="primary-button__trailing" />}
          </button>

          <div className="login-divider"><span>{t('login.or')}</span></div>

          <button className="secondary-button secondary-button--wide" onClick={onDemo} disabled={busy}>
            <Sparkles size={18} />
            {t('login.demo')}
          </button>

          {canOpenOffline && (
            <button className="offline-link" onClick={onOffline} disabled={busy}>
              <CalendarCheck2 size={17} />
              {t('login.offline', { name: offlineProfile?.displayName ?? '—' })}
              <ArrowRight size={15} />
            </button>
          )}

        </div>
      </section>
    </main>
  );
}
