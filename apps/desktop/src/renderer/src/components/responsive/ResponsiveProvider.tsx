import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getBreakpoint, type Breakpoint } from '@/lib/responsive';

interface ResponsiveState {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
}

const ResponsiveContext = createContext<ResponsiveState | null>(null);

function getViewportState(): ResponsiveState {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const breakpoint = getBreakpoint(width);
  const hasTouch =
    window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

  return {
    width,
    height,
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    hasTouch,
  };
}

export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ResponsiveState>(() => getViewportState());

  useEffect(() => {
    const handleResize = () => setState(getViewportState());
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return <ResponsiveContext.Provider value={value}>{children}</ResponsiveContext.Provider>;
}

export function useResponsive() {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsive must be used within ResponsiveProvider');
  }
  return context;
}
