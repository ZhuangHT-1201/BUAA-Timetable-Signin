import { useI18n } from '../i18n';

interface LogoProps {
  compact?: boolean;
  inverse?: boolean;
}

export function Logo({ compact = false, inverse = false }: LogoProps) {
  const { t } = useI18n();
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''} ${inverse ? 'brand--inverse' : ''}`}>
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 44 44" fill="none">
          <rect x="4" y="4" width="36" height="36" rx="5" fill="currentColor" />
          <path d="M11 10h22v25H11z" fill="var(--logo-paper, #fffaf0)" />
          <path d="M11 17h22" stroke="currentColor" strokeWidth="2" />
          <path d="M16 7v5M28 7v5" stroke="var(--logo-paper, #fffaf0)" strokeWidth="2.5" strokeLinecap="square" />
          <rect x="15" y="22" width="12" height="3" fill="var(--logo-accent, #c54d3a)" />
          <path d="m15.5 29 3 3 6-6" stroke="var(--logo-accent, #c54d3a)" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" />
        </svg>
      </span>
      {!compact && (
        <span className="brand__type">
          <strong>{t('app.brand')}</strong>
          <small>{t('app.brandMark')}</small>
        </span>
      )}
    </div>
  );
}
