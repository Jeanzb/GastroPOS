import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { CashService } from '@/services/cash';
import type {
  CloseCashSessionPayload,
  OpenCashSessionPayload,
  RegisterCashMovementPayload,
} from '@/types/cash';

export function useCashSession() {
  const queryClient = useQueryClient();

  const activeSessionQuery = useQuery({
    queryKey: [QUERY_KEYS.cashSession],
    queryFn: () => CashService.getActiveSession(),
  });

  const sessionId = activeSessionQuery.data?.id;

  const movementsQuery = useQuery({
    queryKey: [QUERY_KEYS.cashMovements, sessionId],
    queryFn: () => CashService.getMovements(sessionId ?? ''),
    enabled: Boolean(sessionId),
  });

  const invalidateCash = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cashSession] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.cashMovements] });
  };

  const openMutation = useMutation({
    mutationFn: (payload: OpenCashSessionPayload) => CashService.openSession(payload),
    onSuccess: invalidateCash,
  });

  const movementMutation = useMutation({
    mutationFn: (input: { sessionId: string; payload: RegisterCashMovementPayload }) =>
      CashService.registerMovement(input.sessionId, input.payload),
    onSuccess: invalidateCash,
  });

  const closeMutation = useMutation({
    mutationFn: (input: { sessionId: string; payload: CloseCashSessionPayload }) =>
      CashService.closeSession(input.sessionId, input.payload),
    onSuccess: invalidateCash,
  });

  return {
    activeSessionQuery,
    movementsQuery,
    openMutation,
    movementMutation,
    closeMutation,
  };
}
