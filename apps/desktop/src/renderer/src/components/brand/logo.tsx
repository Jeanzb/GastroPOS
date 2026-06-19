import { cn } from '../../lib/utils';
import logoUrl from '@/assets/gastroia-logo-vector.svg';
import darkLogoUrl from '@/assets/gastroia-logo-dark.svg';
import darkMarkUrl from '@/assets/gastroia-logo-dark-mark.svg';

export function LogoMark({
  className,
  variant = 'default',
}: {
  className?: string;
  variant?: 'default' | 'dark';
}) {
  return (
    <img
      src={variant === 'dark' ? darkMarkUrl : logoUrl}
      className={cn('object-contain', className)}
      alt="GastroIA"
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display font-bold tracking-tight leading-none', className)}>
      Gastro<span className="text-orange">IA</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className="h-9 w-9" />
      <Wordmark className="text-xl" />
    </div>
  );
}

export function DarkLogoLockup({ className }: { className?: string }) {
  return (
    <img
      src={darkLogoUrl}
      className={cn('object-contain', className)}
      alt="GastroIA - Operacion y data restaurantera"
    />
  );
}
