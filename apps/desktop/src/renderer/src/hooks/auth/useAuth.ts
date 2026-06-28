import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { AuthService } from '@/services/auth';
import { clearTerminalBranch } from '@/lib/terminal-branch';
import { useAuthStore } from '@/stores';
import type { LoginRequest, StaffLoginRequest } from '@/types/auth';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const clear = useAuthStore((state) => state.clear);

  const loginMutation = useMutation({
    mutationFn: (payload: LoginRequest) => AuthService.login(payload),
    onSuccess: (data) => {
      clearTerminalBranch();
      queryClient.clear();
      setSession(data);
    },
  });

  const staffLoginMutation = useMutation({
    mutationFn: (payload: StaffLoginRequest) => AuthService.staffLogin(payload),
    onSuccess: (data) => {
      clearTerminalBranch();
      queryClient.clear();
      setSession(data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => AuthService.logout(),
    onSettled: async () => {
      clearTerminalBranch();
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
    staffLoginMutation,
    logout,
    isLoggingOut: logoutMutation.isPending,
  };
}
