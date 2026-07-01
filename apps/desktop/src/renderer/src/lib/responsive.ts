export const RESPONSIVE_VIEWPORTS = [
  { name: 'mobile-sm', width: 360, height: 740 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'mobile-lg', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tablet-lg', width: 834, height: 1194 },
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'desktop-lg', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
] as const;

export type ResponsiveViewportName = (typeof RESPONSIVE_VIEWPORTS)[number]['name'];

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function getBreakpoint(width: number): Breakpoint {
  if (width < 768) {
    return 'mobile';
  }

  if (width < 1024) {
    return 'tablet';
  }

  return 'desktop';
}
