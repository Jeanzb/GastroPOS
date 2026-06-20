import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { AuthService } from '@/services/auth';
import { useAuthStore } from '@/stores';
import type { LoginRequest, PinLoginRequest } from '@/types/auth';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const clear = useAuthStore((state) => state.clear);

  const loginMutation = useMutation({
    mutationFn: (payload: LoginRequest) => AuthService.login(payload),
    onSuccess: (data) => setSession(data),
  });

  const pinLoginMutation = useMutation({
    mutationFn: (payload: PinLoginRequest) => AuthService.pinLogin(payload),
    onSuccess: (data) => setSession(data),
  });

  const logoutMutation = useMutation({
    mutationFn: () => AuthService.logout(),
    onSettled: async () => {
      clear();
      queryClient.clear();
      await router.navigate({ to: '/login', replace: true });
    },
  });

  const logout = async (): Promise<void> => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // The local session is cleared in onSettled even if the API session is already gone.
    }
  };

  return {
    user,
    isAuthenticated: Boolean(user),
    loginMutation,
    pinLoginMutation,
    logout,
    isLoggingOut: logoutMutation.isPending,
  };
}
