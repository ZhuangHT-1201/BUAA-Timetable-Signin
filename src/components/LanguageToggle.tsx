import { Languages } from 'lucide-react';
import { useI18n } from '../i18n';

interface LanguageToggleProps {
  compact?: boolean;
}

export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { language, toggleLanguage, t } = useI18n();
  return (
    <button
      type="button"
      className={`language-toggle ${compact ? 'language-toggle--compact' : ''}`}
      onClick={toggleLanguage}
      title={t('language.switch')}
      aria-label={t('language.switch')}
    >
      <Languages size={15} />
      {!compact && <span>{language === 'zh' ? 'EN' : '中文'}</span>}
    </button>
  );
}
