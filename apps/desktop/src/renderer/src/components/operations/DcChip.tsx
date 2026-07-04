import { cn } from '@/lib/utils';

export type DcChipTone = 'success' | 'warning' | 'danger' | 'neutral' | 'ink';

const TONE_STYLES: Record<DcChipTone, string> = {
  success: 'text-[#14865A] bg-[#E1F2EA]',
  warning: 'text-warning-strong bg-[#F7ECD6]',
  danger: 'text-danger-strong bg-[#FFE5DC]',
  neutral: 'text-[#6B6359] bg-[#F0EBE2]',
  ink: 'text-[#F6F2EC] bg-[#1C1A17]',
};

interface DcChipProps {
  children: string;
  tone?: DcChipTone;
  className?: string;
}

export function DcChip({ children, tone = 'neutral', className }: DcChipProps) {
  return (
    <span
      className={cn(
        'nums inline-block rounded-[7px] px-[9px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.08em]',
        TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
