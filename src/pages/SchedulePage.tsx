import { CalendarDays, ChevronLeft, ChevronRight, Clock3, LocateFixed, MapPin, RefreshCw } from 'lucide-react';
import type { Course, Term, Week } from '../types';
import { formatMonthDay, getDayCourses, parseLocalDate, weekDates } from '../lib/date';
import { useI18n } from '../i18n';

interface SchedulePageProps {
  terms: Term[];
  selectedTermCode: string;
  weeks: Week[];
  selectedWeek: number;
  courses: Course[];
  offline: boolean;
  loading: boolean;
  onTermChange: (code: string) => void;
  onWeekChange: (week: number) => void;
  onCourseClick: (course: Course) => void;
  onRefresh: () => void;
}

const DEFAULT_SECTIONS = [
  ['08:00', '08:45'],
  ['08:50', '09:35'],
  ['09:50', '10:35'],
  ['10:40', '11:25'],
  ['11:30', '12:15'],
  ['14:00', '14:45'],
  ['14:50', '15:35'],
  ['15:50', '16:35'],
  ['16:40', '17:25'],
  ['17:30', '18:15'],
  ['19:00', '19:45'],
  ['19:50', '20:35'],
];
const SECTION_HEIGHT = 68;

export function SchedulePage({
  terms,
  selectedTermCode,
  weeks,
  selectedWeek,
  courses,
  offline,
  loading,
  onTermChange,
  onWeekChange,
  onCourseClick,
  onRefresh,
}: SchedulePageProps) {
  const { t, language } = useI18n();
  const currentWeek = weeks.find((week) => week.number === selectedWeek);
  const dates = weekDates(currentWeek);
  const todayIndex = dates.findIndex((date) => date.toDateString() === new Date().toDateString());
  const sectionCount = Math.max(12, ...courses.map((course) => course.endSection ?? 0));
  const firstWeek = weeks[0]?.number ?? 1;
  const lastWeek = weeks.at(-1)?.number ?? 1;

  return (
    <div className="page page--schedule">
      <header className="page-heading">
        <div>
          <h1>{t('schedule.title')}</h1>
          <p className="page-heading__sub">{t('schedule.subtitle')}</p>
        </div>
        <div className="heading-actions">
          <select
            className="term-select"
            value={selectedTermCode}
            onChange={(event) => onTermChange(event.target.value)}
            aria-label={t('schedule.selectTerm')}
          >
            {terms.map((term) => <option key={term.code} value={term.code}>{term.name}</option>)}
          </select>
          <button className="icon-button soft" onClick={onRefresh} disabled={loading || offline} aria-label={t('schedule.refresh')}>
            <RefreshCw size={19} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      <section className="schedule-toolbar">
        <div className="week-switcher">
          <button
            className="icon-button"
            onClick={() => onWeekChange(selectedWeek - 1)}
            disabled={selectedWeek <= firstWeek || loading}
            aria-label={t('schedule.previous')}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="week-switcher__title">
            <strong>{t('common.weekNumber', { number: currentWeek?.number ?? selectedWeek })}</strong>
            <small>
              {currentWeek ? `${formatMonthDay(parseLocalDate(currentWeek.startDate), language)} — ${formatMonthDay(parseLocalDate(currentWeek.endDate), language)}` : t('schedule.loadingWeeks')}
            </small>
          </div>
          <button
            className="icon-button"
            onClick={() => onWeekChange(selectedWeek + 1)}
            disabled={selectedWeek >= lastWeek || loading}
            aria-label={t('schedule.next')}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="schedule-toolbar__meta">
          {offline && <span className="offline-badge">{t('schedule.snapshot')}</span>}
          <button
            className="today-button"
            onClick={() => onWeekChange(weeks.find((week) => week.current)?.number ?? firstWeek)}
          >
            <LocateFixed size={16} />
            {t('schedule.returnCurrent')}
          </button>
        </div>
      </section>

      <section className={`timetable-wrap ${loading ? 'is-loading' : ''}`}>
        {loading && <div className="timetable-loading"><RefreshCw size={20} className="spin" /> {t('schedule.loadingWeek')}</div>}
        <div className="timetable">
          <div className="timetable__corner"><Clock3 size={16} /><span>{t('schedule.section')}</span></div>
          {dates.map((date, index) => (
            <div
              className={`timetable__day ${index + 1 === todayIndex ? 'is-today' : ''}`}
              key={date.toISOString()}
              style={{ gridColumn: index + 2 }}
            >
              <small>{(language === 'zh' ? ['一', '二', '三', '四', '五', '六', '日'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'])[index]}</small>
              <strong>{date.getDate()}</strong>
              {index + 1 === todayIndex && <i />}
            </div>
          ))}

          <div className="timetable__time-axis" style={{ height: sectionCount * SECTION_HEIGHT }}>
            {Array.from({ length: sectionCount }, (_, index) => {
              const timing = DEFAULT_SECTIONS[index] ?? ['—', '—'];
              return (
                <div className="section-time" key={index} style={{ height: SECTION_HEIGHT }}>
                  <strong>{index + 1}</strong>
                  <small>{timing[0]}</small>
                  <span>{timing[1]}</span>
                </div>
              );
            })}
          </div>

          {dates.map((date, dayIndex) => {
            const dayCourses = getDayCourses(courses, date);
            return (
              <div
                className={`timetable__column ${dayIndex + 1 === todayIndex ? 'is-today' : ''}`}
                key={date.toISOString()}
                style={{ gridColumn: dayIndex + 2, height: sectionCount * SECTION_HEIGHT }}
              >
                {Array.from({ length: sectionCount }, (_, index) => (
                  <span className="timetable__cell-line" key={index} style={{ height: SECTION_HEIGHT }} />
                ))}
                {dayCourses.map((course) => {
                  const begin = Math.max(1, course.beginSection ?? 1);
                  const end = Math.max(begin, course.endSection ?? begin);
                  return (
                    <button
                      className="course-block"
                      key={course.id}
                      onClick={() => onCourseClick(course)}
                      style={{
                        top: (begin - 1) * SECTION_HEIGHT + 5,
                        height: (end - begin + 1) * SECTION_HEIGHT - 10,
                        '--course-color': course.color ?? '#2c7a6b',
                      } as React.CSSProperties}
                    >
                      <strong>{course.name}</strong>
                      <span><MapPin size={12} /> {course.location || t('overview.locationTba')}</span>
                      <small>{course.beginTime}–{course.endTime}</small>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mobile-agenda">
        {dates.map((date, index) => {
          const dayCourses = getDayCourses(courses, date);
          return (
            <article className={`agenda-day ${index + 1 === todayIndex ? 'is-today' : ''}`} key={date.toISOString()}>
              <header>
                <span>{(language === 'zh' ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])[index]}</span>
                <strong>{formatMonthDay(date, language)}</strong>
                {index + 1 === todayIndex && <i>{t('common.today')}</i>}
              </header>
              {dayCourses.length ? dayCourses.map((course) => (
                <button className="agenda-course" onClick={() => onCourseClick(course)} key={course.id}>
                  <i style={{ background: course.color }} />
                  <span className="agenda-course__time">{course.beginTime}<small>{course.endTime}</small></span>
                  <span className="agenda-course__copy"><strong>{course.name}</strong><small><MapPin size={12} />{course.location || t('overview.locationTba')}</small></span>
                  <ChevronRight size={17} />
                </button>
              )) : <p className="agenda-empty"><CalendarDays size={16} /> {t('schedule.noCourses')}</p>}
            </article>
          );
        })}
      </section>
    </div>
  );
}
