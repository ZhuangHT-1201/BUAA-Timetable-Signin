import { LoaderCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import { Logo } from './Logo';

export function BootScreen() {
  const { t } = useI18n();
  return (
    <main className="boot-screen">
      <div className="boot-screen__halo" />
      <Logo />
      <div className="boot-screen__status">
        <LoaderCircle size={17} className="spin" />
        {t('boot.loading')}
      </div>
    </main>
  );
}
