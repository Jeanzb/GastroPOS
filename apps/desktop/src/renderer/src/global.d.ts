import type { GastroBridge } from '../../preload';

declare global {
  interface Window {
    gastroai: GastroBridge;
  }
}

export {};
