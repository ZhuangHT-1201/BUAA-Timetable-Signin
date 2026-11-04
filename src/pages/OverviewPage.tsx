import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Compass,
  MapPin,
  RefreshCw,
  Sparkles,
  TimerReset,
} from 'lucide-react';
import type { Profile, ResolvedConnectionMode, SigninClass, ViewName, Week, Course } from '../types';
import { useI18n, type MessageKey } from '../i18n';
import {
  formatFullDate,
  formatMonthDay,
  getDayCourses,
  minuteOfDay,
  nextCourse,
  parseLocalDate,
  weekDates,
} from '../lib/date';

interface OverviewPageProps {
  profile: Profile | null;
  mode: ResolvedConnectionMode;
  week: Week | undefined;
  courses: Course[];
  signins: SigninClass[];
  cachedAt: string | null;
  offline: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onNavigate: (view: ViewName) => void;
  onCourseClick: (course: Course) => void;
}

function greetingKey(): MessageKey {
  const hour = new Date().getHours();
  if (hour < 6) return 'overview.night';
  if (hour < 11) return 'overview.morning';
  if (hour < 14) return 'overview.noon';
  if (hour < 18) return 'overview.afternoon';
  return 'overview.evening';
}

export function OverviewPage({
  profile,
  mode,
  week,
  courses,
  signins,
  cachedAt,
  offline,
  refreshing,
  onRefresh,
  onNavigate,
  onCourseClick,
}: OverviewPageProps) {
  const { t, language, locale } = useI18n();
  const now = new Date();
  const dates = weekDates(week, now);
  const today = dates.find((date) => date.toDateString() === now.toDateString()) ?? now;
  const dayCourses = getDayCourses(courses, today);
  const next = nextCourse(courses, now);
  const pending = signins.filter((item) => item.status === 0);
  const signed = signins.filter((item) => item.status === 1);
  const totalMinutes = dayCourses.reduce((sum, course) => {
    const begin = minuteOfDay(course.beginTime);
    const end = minuteOfDay(course.endTime);
    return sum + (begin !== null && end !== null ? Math.max(0, end - begin) : 90);
  }, 0);
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const progressCourses = dayCourses.filter((course) => (minuteOfDay(course.endTime) ?? 0) < nowMinute);
  const dayProgress = dayCourses.length ? Math.round((progressCourses.length / dayCourses.length) * 100) : 0;

  return (
    <div className="page page--overview">
      <header className="page-heading page-heading--overview">
        <div>
          <p className="page-heading__date">{formatFullDate(now, language)}</p>
          <h1>{t('overview.greeting', { greeting: t(greetingKey()), name: profile?.displayName ?? '—' })}</h1>
          <p className="page-heading__sub">
            {dayCourses.length ? t('overview.todayCount', { count: dayCourses.length }) : t('overview.noToday')}
          </p>
        </div>
        <div className="heading-actions">
          <span className={`connection-chip ${offline ? 'connection-chip--offline' : ''}`}>
            <span />
            {offline ? t('overview.offlineSchedule') : mode === 'webvpn' ? t('overview.webvpnConnected') : t('overview.directConnected')}
          </span>
          <button className="icon-button soft" onClick={onRefresh} disabled={refreshing || offline} aria-label={t('overview.refreshSchedule')}>
            <RefreshCw size={19} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
      </header>

      <section className="timeline-hero">
        <div className="timeline-hero__texture" />
        <div className="timeline-hero__main">
          <div className="timeline-hero__tag">
            <Sparkles size={15} />
            {week ? t('common.weekNumber', { number: week.number }) : t('common.week')} · {week ? formatMonthDay(parseLocalDate(week.startDate), language) : formatMonthDay(now, language)}
          </div>
          <h2>{next ? t('overview.nextClass') : dayCourses.length ? t('overview.finished') : t('overview.noToday')}</h2>
          {next ? (
            <button className="hero-course" onClick={() => onCourseClick(next)}>
              <span className="hero-course__time">
                <strong>{next.beginTime ?? '--:--'}</strong>
                <small>{next.endTime ?? '--:--'}</small>
              </span>
              <span className="hero-course__rule" />
              <span className="hero-course__copy">
                <strong>{next.name}</strong>
                <small>
                  <MapPin size={14} /> {next.location || t('overview.locationTba')}
                </small>
              </span>
              <ArrowRight size={19} className="hero-course__arrow" />
            </button>
          ) : null}
        </div>
        <aside className="timeline-hero__aside">
          <div className="day-ring" style={{ '--progress': `${dayProgress * 3.6}deg` } as React.CSSProperties}>
            <div><strong>{dayProgress}%</strong><span>{t('overview.dayProgress')}</span></div>
          </div>
          <p>{pending.length ? t('overview.pendingSignins', { count: pending.length }) : signins.length ? t('overview.signinComplete') : t('overview.noSignins')}</p>
          <button onClick={() => onNavigate('attendance')}>
            {offline ? t('overview.viewSignin') : t('overview.openSignin')}
            <ArrowRight size={15} />
          </button>
        </aside>
      </section>

      <section className="stat-row">
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--green"><CalendarDays size={20} /></span>
          <div><small>{t('overview.weeklyCourses')}</small><strong>{new Set(courses.map((course) => course.id)).size}<em> {t('common.classUnit')}</em></strong></div>
          <span className="stat-card__caption">{t('overview.distributed')}</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--blue"><Clock3 size={20} /></span>
          <div><small>{t('overview.todayClasses')}</small><strong>{Math.floor(totalMinutes / 60)}<em> {t('overview.hours')}</em> {totalMinutes % 60}<em> {t('overview.minutes')}</em></strong></div>
          <span className="stat-card__caption">{t('overview.classDuration')}</span>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--orange"><TimerReset size={20} /></span>
          <div><small>{t('overview.signinProgress')}</small><strong>{signed.length}<em> / </em>{signins.length || 0}</strong></div>
          <span className="stat-card__caption">{pending.length ? t('overview.classesPending') : t('overview.statusClear')}</span>
        </article>
      </section>

      <div className="overview-columns">
        <section className="surface-card today-card">
          <header className="section-heading">
            <div><span>{t('overview.todaySchedule')}</span><small>{dayCourses.length ? t('overview.sortedByTime') : t('overview.lightDay')}</small></div>
            <button className="text-button" onClick={() => onNavigate('schedule')}>{t('overview.fullSchedule')} <ArrowRight size={15} /></button>
          </header>
          <div className="today-list">
            {dayCourses.length ? dayCourses.map((course, index) => (
              <button className="today-item" key={course.id} onClick={() => onCourseClick(course)}>
                <span className="today-item__time">
                  <strong>{course.beginTime ?? '--:--'}</strong>
                  <small>{course.endTime ?? '--:--'}</small>
                </span>
                <span className="today-item__line">
                  <i style={{ background: course.color }} />
                  {index < dayCourses.length - 1 && <b />}
                </span>
                <span className="today-item__card">
                  <strong>{course.name}</strong>
                  <small><MapPin size={13} /> {course.location || t('overview.locationTba')}</small>
                </span>
                <span className="today-item__section">{t('overview.section', { section: course.beginSection ?? '?' })}</span>
              </button>
            )) : (
              <div className="calm-empty">
                <span><Compass size={24} /></span>
                <div><strong>{t('overview.emptyTitle')}</strong><p>{t('overview.emptyDetail')}</p></div>
              </div>
            )}
          </div>
        </section>

        <aside className="side-stack">
          <section className="surface-card signin-mini">
            <header className="section-heading">
              <div><span>{t('overview.signin')}</span></div>
              <span className={`status-dot-label ${pending.length ? 'status-dot-label--warm' : ''}`}>
                <i /> {pending.length ? t('overview.pending', { count: pending.length }) : t('overview.statusNormal')}
              </span>
            </header>
            {signins.length ? (
              <div className="signin-mini__body">
                <div className="signin-mini__mark"><MapPin size={22} /></div>
                <div>
                  <strong>{pending[0]?.courseName ?? signins[0].courseName}</strong>
                  <p>{pending.length ? `${pending[0].beginTime} — ${pending[0].endTime}` : t('overview.completed')}</p>
                </div>
              </div>
            ) : (
              <div className="signin-mini__empty">{t('overview.noSignins')}</div>
            )}
            <button className="wide-quiet-button" onClick={() => onNavigate('attendance')}>
              {t('overview.viewAllSignins')} <ArrowRight size={15} />
            </button>
          </section>
        </aside>
      </div>

      <p className="last-updated">
        {offline ? t('overview.snapshot') : t('overview.lastSync')}
        {cachedAt ? ` · ${new Date(cachedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}` : ''}
      </p>
    </div>
  );
}
