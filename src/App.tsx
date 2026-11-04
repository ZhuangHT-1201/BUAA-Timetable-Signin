import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Home,
  MapPinCheck,
  Settings2,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { BootScreen } from './components/BootScreen';
import { CourseDetailDialog } from './components/CourseDetailDialog';
import { LoginScreen } from './components/LoginScreen';
import { Logo } from './components/Logo';
import { SettingsDialog } from './components/SettingsDialog';
import { Toast, type ToastState } from './components/Toast';
import { LanguageToggle } from './components/LanguageToggle';
import {
  platformLabel,
  setBackgroundMonitor,
} from './lib/bridge';
import { localizeErrorMessage, useI18n, type MessageKey, type Language } from './i18n';
import { createDemoData } from './lib/demo';
import {
  clearLocalData,
  clearScheduleCache,
  loadMode,
  loadBackgroundEnabled,
  loadPreference,
  loadProfile,
  loadSchedule,
  saveMode,
  saveBackgroundEnabled,
  savePreference,
  saveProfile,
  saveSchedule,
} from './lib/storage';
import { selectedWeek as findSelectedWeek } from './lib/parsers';
import { OverviewPage } from './pages/OverviewPage';
import { SchedulePage } from './pages/SchedulePage';
import { AttendancePage } from './pages/AttendancePage';
import { CampusError, CampusService, type CampusSession } from './services/campus';
import type {
  CachedSchedule,
  ConnectionMode,
  Course,
  Profile,
  ResolvedConnectionMode,
  SigninClass,
  Term,
  ViewName,
  Week,
} from './types';

type Phase = 'booting' | 'login' | 'workspace';

const NAV_ITEMS: Array<{
  value: ViewName;
  labelKey: MessageKey;
  icon: typeof Home;
}> = [
  { value: 'overview', labelKey: 'nav.overview', icon: Home },
  { value: 'schedule', labelKey: 'nav.schedule', icon: CalendarDays },
  { value: 'attendance', labelKey: 'nav.attendance', icon: MapPinCheck },
];

function readableError(error: unknown, fallback: string, language: Language): string {
  if (error instanceof CampusError) return localizeErrorMessage(error.message, language);
  if (error instanceof Error) return error.message;
  return fallback;
}

function emptyCachedState(): CachedSchedule | null {
  return loadSchedule();
}

export default function App() {
  const { t, language } = useI18n();
  const serviceRef = useRef(new CampusService());
  const restorePromiseRef = useRef<Promise<CampusSession> | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>('booting');
  const [modePreference, setModePreference] = useState<ConnectionMode>(() => loadPreference());
  const [mode, setMode] = useState<ResolvedConnectionMode>(() => loadMode());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermCode, setSelectedTermCode] = useState('');
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [signins, setSignins] = useState<SigninClass[]>([]);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [cachedSchedule, setCachedSchedule] = useState<CachedSchedule | null>(() => emptyCachedState());
  const [cacheProfile, setCacheProfile] = useState<Profile | null>(() => loadProfile());
  const [view, setView] = useState<ViewName>('overview');
  const [offline, setOffline] = useState(false);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [weekLoading, setWeekLoading] = useState(false);
  const [signinLoading, setSigninLoading] = useState(false);
  const [signinError, setSigninError] = useState('');
  const [signingCourseId, setSigningCourseId] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [backgroundEnabled, setBackgroundEnabled] = useState(() => loadBackgroundEnabled());

  const showToast = (message: string, tone: ToastState['tone'] = 'info') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 3_800);
  };

  const persistSession = (session: CampusSession) => {
    const timestamp = new Date().toISOString();
    const cache: CachedSchedule = {
      terms: session.terms,
      selectedTermCode: session.selectedTerm,
      weeks: session.weeks,
      selectedWeek: session.selectedWeek,
      courses: session.courses,
      cachedAt: timestamp,
    };
    saveSchedule(cache);
    saveProfile(session.profile);
    saveMode(session.mode);
    setSelectedTermCode(session.selectedTerm);
    setSelectedWeek(session.selectedWeek);
    setCachedSchedule(cache);
    setCacheProfile(session.profile);
    setCachedAt(timestamp);
  };

  const applySession = (session: CampusSession) => {
    serviceRef.current.mode = session.mode;
    serviceRef.current.source = session.source;
    setProfile(session.profile);
    setMode(session.mode);
    setTerms(session.terms);
    setWeeks(session.weeks);
    setCourses(session.courses);
    setSelectedTermCode(session.selectedTerm);
    setSelectedWeek(session.selectedWeek);
    setOffline(false);
    setDemo(false);
    setError('');
    setSigninError('');
    setView('overview');
    setPhase('workspace');
    persistSession(session);
  };

  const hydrateSignins = async (): Promise<boolean> => {
    setSigninLoading(true);
    try {
      const next = await serviceRef.current.loadSignins();
      setSignins(next);
      setSigninError('');
      return true;
    } catch (signinError) {
      setSignins([]);
      const message = readableError(signinError, t('error.generic'), language);
      setSigninError(message);
      if (signinError instanceof CampusError && signinError.kind === 'permission') {
        showToast(signinError.message, 'error');
      }
      return false;
    } finally {
      setSigninLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const savedProfile = loadProfile();
    const savedMode = loadMode();
    const savedCache = loadSchedule();
    setCacheProfile(savedProfile);
    setCachedSchedule(savedCache);
    if (!savedProfile) {
      setPhase('login');
      return;
    }

    const restore = async () => {
      try {
        if (!restorePromiseRef.current) {
          restorePromiseRef.current = serviceRef.current.resume(savedMode);
        }
        const session = await restorePromiseRef.current;
        if (!active) return;
        applySession(session);
        void hydrateSignins();
      } catch {
        if (!active) return;
        setError(savedCache ? t('error.sessionExpired') : t('error.restoreSession'));
        setPhase('login');
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    document.title = `${t('app.brand')} · ${t('app.brandMark')}`;
  }, [language, t]);

  useEffect(() => {
    if (phase !== 'workspace') return;
    void setBackgroundMonitor({
      enabled: backgroundEnabled && !demo,
      openLabel: t('background.open'),
      quitLabel: t('background.quit'),
      monitorText: t('background.monitorText'),
    });
  }, [backgroundEnabled, demo, language, phase, t]);

  useEffect(() => {
    if (
      !backgroundEnabled ||
      phase !== 'workspace' ||
      offline ||
      demo ||
      platformLabel() !== 'Windows'
    ) return;
    let stopped = false;
    const checkSignins = async () => {
      try {
        const next = await serviceRef.current.loadSignins();
        if (stopped) return;
        setSignins(next);
        setSigninError('');
        for (const course of next.filter((item) => item.status === 0)) {
          const result = await serviceRef.current.signIn(course.courseId);
          if (stopped) return;
          if (result.success) {
            setSignins((current) =>
              current.map((item) =>
                item.courseId === course.courseId ? { ...item, status: 1 } : item,
              ),
            );
          }
        }
      } catch {}
    };
    void checkSignins();
    const timer = window.setInterval(checkSignins, 60_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [backgroundEnabled, demo, offline, phase, t]);

  const handleConnect = async () => {
    setBusy(true);
    setError('');
    savePreference(modePreference);
    try {
      const session = await serviceRef.current.connect(modePreference, t('auth.windowTitle'));
      applySession(session);
      void hydrateSignins();
    } catch (connectError) {
      const message = readableError(connectError, t('error.generic'), language);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = () => {
    const data = createDemoData(language);
    const current = findSelectedWeek(data.weeks);
    const timestamp = new Date().toISOString();
    setProfile(data.profile);
    setTerms(data.terms);
    setWeeks(data.weeks);
    setCourses(data.courses);
    setSignins(data.signins);
    setSigninError('');
    setSelectedTermCode(data.terms[0].code);
    setSelectedWeek(current?.number ?? 1);
    setCachedAt(timestamp);
    setOffline(false);
    setDemo(true);
    setError('');
    setView('overview');
    setPhase('workspace');
    showToast(t('toast.demo'), 'info');
  };

  const handleOffline = () => {
    const cache = loadSchedule();
    if (!cache) {
      showToast(t('toast.noOffline'), 'error');
      return;
    }
    setProfile(loadProfile());
    setMode(loadMode());
    setTerms(cache.terms);
    setWeeks(cache.weeks);
    setCourses(cache.courses);
    setSelectedTermCode(cache.selectedTermCode);
    setSelectedWeek(cache.selectedWeek);
    setCachedAt(cache.cachedAt);
    setSignins([]);
    setSigninError('');
    setOffline(true);
    setDemo(false);
    setError('');
    setView('overview');
    setPhase('workspace');
  };

  const updateCache = (
    nextCourses: Course[],
    nextTermCode = selectedTermCode,
    nextWeek = selectedWeek,
    nextWeeks = weeks,
  ) => {
    if (offline || demo) return;
    const timestamp = new Date().toISOString();
    const cache: CachedSchedule = {
      terms,
      selectedTermCode: nextTermCode,
      weeks: nextWeeks,
      selectedWeek: nextWeek,
      courses: nextCourses,
      cachedAt: timestamp,
    };
    saveSchedule(cache);
    setCachedSchedule(cache);
    setCachedAt(timestamp);
  };

  const handleWeekChange = async (weekNumber: number) => {
    if (weekNumber < 1 || weekNumber > (weeks.at(-1)?.number ?? 1) || weekNumber === selectedWeek) return;
    if (offline || demo) {
      if (offline) {
        showToast(t('toast.offlineOneWeek'), 'info');
      } else {
        setSelectedWeek(weekNumber);
      }
      return;
    }
    setWeekLoading(true);
    try {
      const next = await serviceRef.current.loadWeek(selectedTermCode, weekNumber);
      setSelectedWeek(weekNumber);
      setCourses(next);
      updateCache(next, selectedTermCode, weekNumber);
    } catch (weekError) {
      showToast(readableError(weekError, t('error.generic'), language), 'error');
    } finally {
      setWeekLoading(false);
    }
  };

  const handleTermChange = async (termCode: string) => {
    if (termCode === selectedTermCode) return;
    if (offline || demo) {
      showToast(t('toast.reloginTerm'), 'info');
      return;
    }
    setWeekLoading(true);
    try {
      const nextTerms = terms.map((term) => ({ ...term, selected: term.code === termCode }));
      const nextWeeks = await serviceRef.current.loadWeeks(termCode);
      const target = findSelectedWeek(nextWeeks);
      if (!target) throw new CampusError(t('error.noWeeks'), 'data');
      const nextCourses = await serviceRef.current.loadWeek(termCode, target.number);
      setTerms(nextTerms);
      setWeeks(nextWeeks);
      setSelectedTermCode(termCode);
      setSelectedWeek(target.number);
      setCourses(nextCourses);
      updateCache(nextCourses, termCode, target.number, nextWeeks);
    } catch (termError) {
      showToast(readableError(termError, t('error.generic'), language), 'error');
    } finally {
      setWeekLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (demo) {
      setCachedAt(new Date().toISOString());
      showToast(t('toast.demoRefreshed'), 'success');
      return;
    }
    if (offline) {
      showToast(t('toast.offlineNoSync'), 'error');
      return;
    }
    setBusy(true);
    try {
      const session = await serviceRef.current.resume(mode);
      applySession(session);
      await hydrateSignins();
      showToast(t('toast.synced'), 'success');
    } catch (refreshError) {
      showToast(readableError(refreshError, t('error.generic'), language), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshSignins = async () => {
    if (demo) {
      setSignins((current) => [...current]);
      showToast(t('toast.demoSigninRefreshed'), 'success');
      return;
    }
    if (offline) {
      showToast(t('toast.offlineNoSignin'), 'error');
      return;
    }
    const refreshed = await hydrateSignins();
    if (refreshed) showToast(t('toast.signinRefreshed'), 'success');
  };

  const handleSignin = async (courseId: string) => {
    if (demo) {
      setSignignDemo(courseId);
      return;
    }
    setSigningCourseId(courseId);
    try {
      const result = await serviceRef.current.signIn(courseId);
      showToast(localizeErrorMessage(result.message, language), result.success ? 'success' : 'error');
      if (result.success) {
        setSigninError('');
        setSignins((current) =>
          current.map((item) => (item.courseId === courseId ? { ...item, status: 1 } : item)),
        );
      }
    } catch (signinError) {
      showToast(readableError(signinError, t('error.generic'), language), 'error');
    } finally {
      setSigningCourseId(null);
    }
  };

  const setSignignDemo = (courseId: string) => {
    setSignins((current) =>
      current.map((item) => (item.courseId === courseId ? { ...item, status: 1 } : item)),
    );
    showToast(t('toast.demoSigned'), 'success');
  };

  const handleLogout = async () => {
    setSettingsOpen(false);
    setBusy(true);
    setBackgroundEnabled(false);
    saveBackgroundEnabled(false);
    try {
      await setBackgroundMonitor({
        enabled: false,
        openLabel: t('background.open'),
        quitLabel: t('background.quit'),
        monitorText: t('background.monitorText'),
      });
    } catch {}
    try {
      if (!demo) await serviceRef.current.logout();
    } catch {}
    clearLocalData(false);
    setProfile(null);
    setTerms([]);
    setWeeks([]);
    setCourses([]);
    setSignins([]);
    setSigninError('');
    setCachedSchedule(null);
    setCacheProfile(null);
    setSelectedTermCode('');
    setSelectedWeek(1);
    setCachedAt(null);
    setOffline(false);
    setDemo(false);
    setError('');
    setPhase('login');
    setView('overview');
    setBusy(false);
  };

  const handleClearCache = () => {
    clearScheduleCache();
    setCachedSchedule(null);
    setCachedAt(null);
    setSettingsOpen(false);
    showToast(t('toast.cacheCleared'), 'success');
  };

  const handleBackgroundChange = async (enabled: boolean) => {
    setBackgroundEnabled(enabled);
    saveBackgroundEnabled(enabled);
    try {
      const status = await setBackgroundMonitor({
        enabled,
        openLabel: t('background.open'),
        quitLabel: t('background.quit'),
        monitorText: t('background.monitorText'),
      });
      if (status.enabled !== enabled) throw new Error();
      showToast(enabled ? t('toast.backgroundOn') : t('toast.backgroundOff'), 'success');
    } catch {
      setBackgroundEnabled(false);
      saveBackgroundEnabled(false);
      showToast(t('error.generic'), 'error');
    }
  };

  if (phase === 'booting') return <BootScreen />;

  if (phase === 'login') {
    return (
      <>
        <LoginScreen
          modePreference={modePreference}
          onModeChange={(nextMode) => {
            setModePreference(nextMode);
            savePreference(nextMode);
          }}
          onConnect={handleConnect}
          onDemo={handleDemo}
          onOffline={handleOffline}
          canOpenOffline={Boolean(cachedSchedule)}
          offlineProfile={cacheProfile}
          busy={busy}
          error={error}
          platform={platformLabel()}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  const currentWeek = weeks.find((week) => week.number === selectedWeek);
  const navigate = (nextView: ViewName) => {
    setView(nextView);
    const liveCurrentWeek = weeks.find((week) => week.current);
    if (
      nextView === 'overview' &&
      !offline &&
      !demo &&
      liveCurrentWeek &&
      liveCurrentWeek.number !== selectedWeek
    ) {
      void handleWeekChange(liveCurrentWeek.number);
    }
  };
  const page =
    view === 'overview' ? (
      <OverviewPage
        profile={profile}
        mode={mode}
        week={currentWeek}
        courses={courses}
        signins={signins}
        cachedAt={cachedAt}
        offline={offline}
        refreshing={busy}
        onRefresh={handleRefresh}
        onNavigate={navigate}
        onCourseClick={setSelectedCourse}
      />
    ) : view === 'schedule' ? (
      <SchedulePage
        terms={terms}
        selectedTermCode={selectedTermCode}
        weeks={weeks}
        selectedWeek={selectedWeek}
        courses={courses}
        offline={offline}
        loading={weekLoading}
        onTermChange={handleTermChange}
        onWeekChange={handleWeekChange}
        onCourseClick={setSelectedCourse}
        onRefresh={handleRefresh}
      />
    ) : (
      <AttendancePage
        signins={signins}
        offline={offline}
        loading={signinLoading}
        error={signinError}
        signingCourseId={signingCourseId}
        onRefresh={handleRefreshSignins}
        onSignin={handleSignin}
      />
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__top">
          <Logo />
          <div className="sidebar__tools">
            <span className={`sidebar__session ${offline ? 'is-offline' : ''}`}>
              {offline ? <WifiOff size={13} /> : <Wifi size={13} />}
              {offline ? t('common.offline') : mode === 'webvpn' ? t('common.webvpn') : t('common.direct')}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label={t('nav.primary')}>
          <p>{t('sidebar.campus')}</p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                className={view === item.value ? 'is-active' : ''}
                onClick={() => navigate(item.value)}
              >
                <span><Icon size={19} strokeWidth={2} /></span>
                {t(item.labelKey)}
                {item.value === 'attendance' && signins.some((signin) => signin.status === 0) && <i />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar__focus">
          <span>{t('common.week')}</span>
          <strong>{currentWeek ? t('common.weekNumber', { number: currentWeek.number }) : t('common.week')}</strong>
          <p>{courses.length ? t('sidebar.scheduled', { count: courses.length }) : t('sidebar.noCourses')}</p>
          <div className="focus-dots">
            {Array.from({ length: 7 }, (_, index) => (
              <i key={index} className={courses.some((course) => course.dayOfWeek === index + 1) ? 'has-course' : ''} />
            ))}
          </div>
        </div>

        <div className="sidebar__bottom">
          {demo && <span className="demo-ribbon"><Sparkles size={13} /> {t('common.demo')}</span>}
          <button className="profile-button" onClick={() => setSettingsOpen(true)}>
            <span className="profile-button__avatar">{(profile?.displayName ?? 'B').slice(0, 1)}</span>
            <span><strong>{profile?.displayName ?? t('common.campusUser')}</strong><small>{profile?.studentId ?? t('common.personalAccount')}</small></span>
            <Settings2 size={18} />
          </button>
        </div>
      </aside>

      <header className="mobile-header">
        <Logo compact />
        <div>
          {demo && <span className="demo-ribbon"><Sparkles size={12} /> {t('common.demo')}</span>}
          <LanguageToggle compact />
          <button className="mobile-avatar" onClick={() => setSettingsOpen(true)}>{(profile?.displayName ?? 'B').slice(0, 1)}</button>
        </div>
      </header>

      <div className="app-content">{page}</div>

      <nav className="mobile-nav" aria-label={t('nav.mobile')}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.value} className={view === item.value ? 'is-active' : ''} onClick={() => navigate(item.value)}>
              <span>
                <Icon size={20} />
                {item.value === 'attendance' && signins.some((signin) => signin.status === 0) && <i />}
              </span>
              {t(item.labelKey)}
            </button>
          );
        })}
      </nav>

      <CourseDetailDialog course={selectedCourse} onClose={() => setSelectedCourse(null)} />
      <SettingsDialog
        open={settingsOpen}
        profile={profile}
        mode={mode}
        week={currentWeek}
        cachedAt={cachedAt}
        offline={offline}
        backgroundEnabled={backgroundEnabled}
          backgroundAvailable={!demo && platformLabel() !== 'Web'}
        onBackgroundChange={handleBackgroundChange}
        onClose={() => setSettingsOpen(false)}
        onLogout={handleLogout}
        onClearData={handleClearCache}
      />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
