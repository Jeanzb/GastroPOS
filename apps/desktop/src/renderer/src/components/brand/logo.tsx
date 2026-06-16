import { cn } from '../../lib/utils';

const NETWORK_NODES: ReadonlyArray<readonly [number, number]> = [
  [32, 22],
  [24, 28],
  [40, 28],
  [32, 30],
  [27, 35],
  [37, 35],
  [32, 38],
];

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      role="img"
      aria-label="GastroAI"
    >
      <circle cx="32" cy="11" r="3" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="32" cy="11" r="1.1" fill="#ff6a00" />
      <line x1="32" y1="14" x2="32" y2="18.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />

      <path d="M12 39 A20 20 0 0 1 52 39" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 39 H52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />

      <line x1="32" y1="39" x2="32" y2="45" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9 45 H55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M9 45 L13 49.5 H51 L55 45" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      <g stroke="#ff6a00" strokeWidth="1.6" strokeLinecap="round">
        <line x1="32" y1="22" x2="24" y2="28" />
        <line x1="32" y1="22" x2="40" y2="28" />
        <line x1="32" y1="22" x2="32" y2="30" />
        <line x1="24" y1="28" x2="32" y2="30" />
        <line x1="40" y1="28" x2="32" y2="30" />
        <line x1="24" y1="28" x2="27" y2="35" />
        <line x1="40" y1="28" x2="37" y2="35" />
        <line x1="32" y1="30" x2="27" y2="35" />
        <line x1="32" y1="30" x2="37" y2="35" />
        <line x1="27" y1="35" x2="32" y2="38" />
        <line x1="37" y1="35" x2="32" y2="38" />
      </g>

      <g fill="#ff6a00">
        {NETWORK_NODES.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.1" />
        ))}
      </g>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn('font-display font-bold tracking-tight leading-none', className)}
    >
      Gastro<span className="text-orange">AI</span>
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
