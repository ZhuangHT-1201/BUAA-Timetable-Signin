import { BookOpen, Clock3, MapPin, UserRound, X } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Course } from '../types';

interface CourseDetailDialogProps {
  course: Course | null;
  onClose: () => void;
}

export function CourseDetailDialog({ course, onClose }: CourseDetailDialogProps) {
  const { t } = useI18n();
  if (!course) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="course-dialog" role="dialog" aria-modal="true" aria-label={t('course.detail')}>
        <button className="icon-button course-dialog__close" onClick={onClose} aria-label={t('common.close')}>
          <X size={20} />
        </button>
        <span className="course-dialog__bar" style={{ background: course.color ?? '#2c7a6b' }} />
        <div className="course-dialog__eyebrow"><BookOpen size={15} /> {t('course.detail')}</div>
        <h2>{course.name}</h2>
        <p className="course-dialog__sub">
          {course.code || t('course.course')}
          {course.credit ? ` · ${t('course.credits', { credits: course.credit })}` : ''}
        </p>
        <div className="course-detail-grid">
          <div>
            <span><Clock3 size={17} /></span>
            <small>{t('course.time')}</small>
            <strong>
              {course.beginTime && course.endTime
                ? `${course.beginTime} — ${course.endTime}`
                : t('course.sections', {
                    begin: course.beginSection ?? '?',
                    end: course.endSection ?? '?',
                  })}
            </strong>
          </div>
          <div>
            <span><MapPin size={17} /></span>
            <small>{t('course.location')}</small>
            <strong>{course.location || t('overview.locationTba')}</strong>
          </div>
          <div>
            <span><UserRound size={17} /></span>
            <small>{t('course.teacher')}</small>
            <strong>{course.teachers || t('course.teacherTba')}</strong>
          </div>
          <div>
            <span><BookOpen size={17} /></span>
            <small>{t('course.code')}</small>
            <strong>{course.code || '—'}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
