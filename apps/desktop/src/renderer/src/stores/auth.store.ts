import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getAvailableRoleProfilesForRole,
  getPermissionsForRole,
  type RoleProfile,
} from '@gastroai/contracts';
import { AUTH_STORAGE_KEY } from '@/constants';
import type { AuthTokens, CurrentUser, LoginResponse, UserRole } from '@/types/auth';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: CurrentUser | null;
  activeRole: UserRole | null;
  setSession: (session: LoginResponse) => void;
  setTokens: (tokens: AuthTokens) => void;
  setActiveRole: (role: UserRole) => void;
  clear: () => void;
}

function withAccessProfile(user: CurrentUser): CurrentUser {
  const maybeUser = user as CurrentUser & {
    permissions?: CurrentUser['permissions'];
    availableRoles?: RoleProfile[];
  };

  return {
    ...user,
    permissions: maybeUser.permissions?.length
      ? maybeUser.permissions
      : getPermissionsForRole(user.role),
    availableRoles: maybeUser.availableRoles?.length
      ? maybeUser.availableRoles
      : getAvailableRoleProfilesForRole(user.role),
  };
}

function defaultActiveRole(user: CurrentUser): UserRole {
  const roles = withAccessProfile(user).availableRoles.map((profile) => profile.role);
  if (roles.includes('ADMIN')) {
    return 'ADMIN';
  }
  return roles[0] ?? user.role;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      activeRole: null,
      setSession: (session) => {
        const user = withAccessProfile(session.user);

        set({
          accessToken: session.tokens.accessToken,
          refreshToken: session.tokens.refreshToken,
          user,
          activeRole: defaultActiveRole(user),
        });
      },
      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      setActiveRole: (role) => set({ activeRole: role }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          activeRole: null,
        }),
    }),
    { name: AUTH_STORAGE_KEY },
  ),
);
