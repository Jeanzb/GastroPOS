import { cn } from '../../lib/utils';

const NETWORK_NODES: ReadonlyArray<readonly [number, number, number]> = [
  [256, 150, 14],
  [200, 184, 13],
  [312, 184, 13],
  [256, 214, 14],
  [150, 242, 13],
  [206, 242, 13],
  [306, 242, 13],
  [362, 242, 13],
  [256, 272, 14],
];

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 420" className={className} fill="none" role="img" aria-label="GastroIA">
      <g stroke="currentColor" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round">
        <path d="M70 300 A186 186 0 0 1 442 300" />
      </g>

      <circle cx="256" cy="74" r="27" stroke="currentColor" strokeWidth="18" />
      <circle cx="256" cy="74" r="11" fill="#FF6A1A" />

      <rect x="58" y="314" width="170" height="22" rx="11" fill="currentColor" />
      <rect x="284" y="314" width="170" height="22" rx="11" fill="currentColor" />

      <g stroke="#FF6A1A" strokeWidth="7" strokeLinecap="round">
        <line x1="256" y1="262" x2="256" y2="346" />
        <line x1="256" y1="150" x2="200" y2="184" />
        <line x1="256" y1="150" x2="312" y2="184" />
        <line x1="200" y1="184" x2="256" y2="214" />
        <line x1="312" y1="184" x2="256" y2="214" />
        <line x1="200" y1="184" x2="206" y2="242" />
        <line x1="312" y1="184" x2="306" y2="242" />
        <line x1="200" y1="184" x2="150" y2="242" />
        <line x1="312" y1="184" x2="362" y2="242" />
        <line x1="256" y1="214" x2="206" y2="242" />
        <line x1="256" y1="214" x2="306" y2="242" />
        <line x1="256" y1="214" x2="256" y2="272" />
        <line x1="206" y1="242" x2="256" y2="272" />
        <line x1="306" y1="242" x2="256" y2="272" />
        <line x1="150" y1="242" x2="206" y2="242" />
        <line x1="362" y1="242" x2="306" y2="242" />
      </g>

      <g fill="#FF6A1A">
        {NETWORK_NODES.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
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
