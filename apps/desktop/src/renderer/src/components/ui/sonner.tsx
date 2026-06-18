import { CheckIcon, InfoIcon, Loader2Icon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const iconBase = 'toast-icon-pop grid size-8 place-items-center rounded-[9px] [&_svg]:size-4';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-center"
      duration={2800}
      icons={{
        success: (
          <span className={`${iconBase} text-[#7DDCA9]`} style={{ background: 'rgba(20,134,90,0.26)' }}>
            <CheckIcon strokeWidth={3} />
          </span>
        ),
        info: (
          <span className={`${iconBase} text-[#FFB39A]`} style={{ background: 'rgba(255,90,44,0.22)' }}>
            <InfoIcon />
          </span>
        ),
        warning: (
          <span className={`${iconBase} text-[#F0C879]`} style={{ background: 'rgba(201,137,43,0.28)' }}>
            <TriangleAlertIcon />
          </span>
        ),
        error: (
          <span className={`${iconBase} text-[#F2A28C]`} style={{ background: 'rgba(192,67,26,0.3)' }}>
            <XIcon strokeWidth={3} />
          </span>
        ),
        loading: (
          <span className={`${iconBase} text-[#FFB39A]`} style={{ background: 'rgba(255,90,44,0.22)' }}>
            <Loader2Icon className="animate-spin" />
          </span>
        ),
      }}
      toastOptions={{
        classNames: {
          toast: 'dc-toast',
          title: 'dc-toast-title',
          description: 'dc-toast-desc',
        },
      }}
      style={
        {
          '--normal-bg': '#1c1a17',
          '--normal-text': '#f3efe8',
          '--normal-border': '#2e2a25',
          '--border-radius': '14px',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
