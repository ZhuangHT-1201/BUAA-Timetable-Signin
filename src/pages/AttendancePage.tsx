import {
  Check,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  RefreshCw,
  TimerReset,
} from 'lucide-react';
import type { SigninClass } from '../types';
import { formatFullDate } from '../lib/date';
import { useI18n } from '../i18n';

interface AttendancePageProps {
  signins: SigninClass[];
  offline: boolean;
  loading: boolean;
  error: string;
  signingCourseId: string | null;
  onRefresh: () => void;
  onSignin: (courseId: string) => void;
}

export function AttendancePage({
  signins,
  offline,
  loading,
  error,
  signingCourseId,
  onRefresh,
  onSignin,
}: AttendancePageProps) {
  const { t, language } = useI18n();
  const pending = signins.filter((item) => item.status === 0);
  const signed = signins.filter((item) => item.status === 1);

  return (
    <div className="page page--attendance">
      <header className="page-heading">
        <div>
          <h1>{t('attendance.title')}</h1>
          <p className="page-heading__sub">{formatFullDate(new Date(), language)}</p>
        </div>
        <button className="refresh-button" onClick={onRefresh} disabled={loading || offline}>
          <RefreshCw size={17} className={loading ? 'spin' : ''} />
          {t('attendance.refresh')}
        </button>
      </header>

      <section className="attendance-summary">
        <div className="attendance-summary__main">
          <span className="attendance-summary__icon"><MapPin size={24} /></span>
          <div>
            <p>{t('attendance.today')}</p>
            <h2>{pending.length ? t('attendance.pendingSummary', { count: pending.length }) : signins.length ? t('attendance.allComplete') : t('attendance.notPublished')}</h2>
          </div>
        </div>
        <div className="attendance-summary__stats">
          <div><strong>{pending.length}</strong><span>{t('attendance.pending')}</span></div>
          <i />
          <div><strong>{signed.length}</strong><span>{t('attendance.completed')}</span></div>
          <i />
          <div><strong>{signins.length}</strong><span>{t('attendance.allClasses')}</span></div>
        </div>
      </section>

      <section className="surface-card attendance-list-card attendance-list-card--wide">
          <header className="section-heading">
            <div><span>{t('attendance.todayClasses')}</span><small>{t('attendance.records', { count: signins.length })}</small></div>
            <span className="live-label"><i /> {t('attendance.live')}</span>
          </header>

          {offline ? (
            <div className="attendance-empty">
              <span><RefreshCw size={27} /></span>
              <h3>{t('attendance.offline')}</h3>
            </div>
          ) : loading && !signins.length ? (
            <div className="attendance-empty"><LoaderCircle className="spin" size={26} /><h3>{t('attendance.loading')}</h3></div>
          ) : error && !signins.length ? (
            <div className="attendance-empty">
              <span><RefreshCw size={27} /></span>
              <h3>{t('attendance.error')}</h3>
              <p>{error}</p>
              <button className="wide-quiet-button" onClick={onRefresh}>{t('attendance.retry')} <RefreshCw size={14} /></button>
            </div>
          ) : signins.length ? (
            <div className="attendance-items">
              {signins.map((item) => (
                <article className={`attendance-item ${item.status === 1 ? 'attendance-item--done' : ''}`} key={item.courseId}>
                  <div className="attendance-item__time">
                    <strong>{item.beginTime || '--:--'}</strong>
                    <span>{item.endTime || '--:--'}</span>
                  </div>
                  <div className="attendance-item__mark">
                    {item.status === 1 ? <Check size={19} /> : <MapPin size={19} />}
                  </div>
                  <div className="attendance-item__copy">
                    <strong>{item.courseName}</strong>
                    <p>
                      {item.status === 1
                        ? t('attendance.success')
                        : t('attendance.notSigned')}
                    </p>
                  </div>
                  {item.status === 1 ? (
                    <span className="signed-chip"><CheckCircle2 size={15} /> {t('attendance.signed')}</span>
                  ) : (
                    <button
                      className="signin-button"
                      onClick={() => onSignin(item.courseId)}
                      disabled={Boolean(signingCourseId)}
                    >
                      {signingCourseId === item.courseId ? <LoaderCircle size={16} className="spin" /> : <MapPin size={16} />}
                      {signingCourseId === item.courseId ? t('attendance.signing') : t('attendance.signNow')}
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="attendance-empty">
              <span><TimerReset size={27} /></span>
              <h3>{t('attendance.none')}</h3>
              <button className="wide-quiet-button" onClick={onRefresh}>{t('attendance.refresh')} <RefreshCw size={14} /></button>
            </div>
          )}
      </section>
    </div>
  );
}
