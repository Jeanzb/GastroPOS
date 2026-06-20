import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PLATFORM_AUTH_STORAGE_KEY } from '@/constants';
import type { PlatformAuthResponse, PlatformUserDto } from '@gastroai/contracts';

interface PlatformAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: PlatformUserDto | null;
  setSession: (session: PlatformAuthResponse) => void;
  setTokens: (tokens: PlatformAuthResponse['tokens']) => void;
  clear: () => void;
}

export const usePlatformAuthStore = create<PlatformAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (session) =>
        set({
          accessToken: session.tokens.accessToken,
          refreshToken: session.tokens.refreshToken,
          user: session.user,
        }),
      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
        }),
    }),
    { name: PLATFORM_AUTH_STORAGE_KEY },
  ),
);
