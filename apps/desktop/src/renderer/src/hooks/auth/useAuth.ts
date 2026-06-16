import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/services/auth';
import { useAuthStore } from '@/stores';
import type { LoginRequest } from '@/types/auth';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const clear = useAuthStore((state) => state.clear);

  const loginMutation = useMutation({
    mutationFn: (payload: LoginRequest) => AuthService.login(payload),
    onSuccess: (data) => setSession(data),
  });

  const logout = async (): Promise<void> => {
    try {
      await AuthService.logout();
    } finally {
      clear();
    }
  };

  return {
    user,
    isAuthenticated: Boolean(user),
    loginMutation,
    logout,
  };
}
